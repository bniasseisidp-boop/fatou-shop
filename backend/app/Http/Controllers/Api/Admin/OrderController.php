<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Services\OrderStock;
use App\Services\DriverAssignment;
use App\Services\ReferralQualification;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orders = Order::query()
            ->withCount('items')
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = '%'.$request->string('search')->toString().'%';
                $query->where(fn ($builder) => $builder
                    ->where('reference', 'like', $search)
                    ->orWhere('customer_name', 'like', $search)
                    ->orWhere('customer_phone', 'like', $search));
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('payment_status'), fn ($query) => $query->where('payment_status', $request->string('payment_status')->toString()))
            ->latest()
            ->paginate(20);

        return response()->json($orders);
    }

    public function show(Order $order): JsonResponse
    {
        $order->load(['items.product', 'deliveryZone', 'driver:id,name,phone,current_latitude,current_longitude,location_updated_at']);

        return response()->json([
            'order' => $order,
            'proof_url' => $order->payment_proof_path ? route('api.admin.orders.proof', $order) : null,
            'store_location' => Setting::query()->find('store_location')?->value ?? [
                'latitude' => 14.712,
                'longitude' => -17.454,
            ],
        ]);
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:pending,confirmed,preparing,in_delivery,delivered,cancelled'],
            'payment_status' => ['required', 'in:unpaid,submitted,verified,rejected'],
            'admin_notes' => ['nullable', 'string', 'max:3000'],
        ]);

        $order = DB::transaction(function () use ($order, $data): Order {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);
            $wasDelivered = $order->status === 'delivered';
            $assignedDriverId = $order->driver_id;

            if ($wasDelivered && $data['status'] !== 'delivered') {
                throw ValidationException::withMessages([
                    'status' => ['Une commande déjà livrée ne peut pas être réouverte ou annulée.'],
                ]);
            }

            if ($data['payment_status'] === 'verified' && ! $order->payment_proof_path) {
                throw ValidationException::withMessages([
                    'payment_status' => ['Aucun justificatif n’est joint à cette commande.'],
                ]);
            }

            if (in_array($data['status'], ['confirmed', 'preparing', 'in_delivery', 'delivered'], true)
                && $data['payment_status'] !== 'verified') {
                throw ValidationException::withMessages([
                    'status' => ['Validez le paiement avant de confirmer ou préparer la livraison.'],
                ]);
            }

            $stock = app(OrderStock::class);
            if ($data['status'] === 'cancelled' && $order->status !== 'cancelled') {
                $stock->release($order);
            } elseif ($order->status === 'cancelled' && $data['status'] !== 'cancelled') {
                $stock->reserve($order);
            } elseif (! $order->stock_reserved
                && $order->status !== $data['status']
                && $data['status'] !== 'cancelled') {
                $stock->reserve($order);
            }

            if ($data['status'] === 'delivered') {
                $stock->markSold($order);
            }
            if ($data['status'] === 'cancelled') {
                $order->forceFill(['driver_id' => null])->save();
            }

            $data['payment_verified_at'] = $data['payment_status'] === 'verified'
                ? ($order->payment_verified_at ?? now())
                : null;
            $data['delivered_at'] = $data['status'] === 'delivered'
                ? ($order->delivered_at ?? now())
                : null;

            $order->update($data);
            if (in_array($data['status'], ['cancelled', 'delivered'], true) && $assignedDriverId) {
                User::query()->whereKey($assignedDriverId)->update([
                    'current_latitude' => null,
                    'current_longitude' => null,
                    'location_updated_at' => null,
                ]);
            }

            if (in_array($data['status'], ['confirmed', 'preparing', 'in_delivery'], true) && ! $order->driver_id) {
                app(DriverAssignment::class)->assign($order);
            }
            if ($data['status'] === 'delivered' && ! $wasDelivered) {
                app(ReferralQualification::class)->qualify($order);
            }

            return $order;
        });
        app(DriverAssignment::class)->assignWaitingOrders();

        return response()->json(['order' => $order->refresh()->load(['driver:id,name,phone'])->loadCount('items')]);
    }

    public function destroy(Order $order): JsonResponse
    {
        $proofPath = $order->payment_proof_path;
        $reference = $order->reference;
        DB::transaction(function () use ($order): void {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            app(OrderStock::class)->release($lockedOrder);
            $lockedOrder->delete();
        });
        app(DriverAssignment::class)->assignWaitingOrders();

        if ($proofPath && ! Storage::disk('local')->delete($proofPath)) {
            Log::warning('A payment proof could not be removed after deleting its order.', [
                'order_reference' => $reference,
            ]);
        }

        return response()->json(['message' => 'Commande supprimée.']);
    }

    public function proof(Request $request, Order $order): BinaryFileResponse|StreamedResponse
    {
        $path = $order->payment_proof_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        $filename = $order->reference.'-justificatif.'.pathinfo($path, PATHINFO_EXTENSION);

        if ($request->boolean('download')) {
            return Storage::disk('local')->download($path, $filename);
        }

        return response()->file(Storage::disk('local')->path($path), [
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
