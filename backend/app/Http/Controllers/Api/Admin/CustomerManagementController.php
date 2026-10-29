<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CustomerAnnouncement;
use App\Models\Order;
use App\Models\User;
use App\Services\OrderStock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class CustomerManagementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $customers = User::query()
            ->where('is_admin', false)
            ->where('is_driver', false)
            ->whereNotNull('phone')
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = '%'.$request->string('search')->toString().'%';
                $query->where(fn ($builder) => $builder
                    ->where('name', 'like', $search)
                    ->orWhere('phone', 'like', $search));
            })
            ->withCount(['orders', 'referrals'])
            ->withSum(['orders as amount_paid' => fn ($query) => $query->where('payment_status', 'verified')], 'total')
            ->latest()
            ->paginate(25);

        $customers->through(fn (User $customer): array => [
            'id' => $customer->id,
            'name' => $customer->name,
            'phone' => $customer->phone,
            'created_at' => $customer->created_at,
            'photo_url' => $customer->profile_photo_path ? route('api.admin.customers.photo', $customer) : null,
            'orders_count' => $customer->orders_count,
            'referrals_count' => $customer->referrals_count,
            'amount_paid' => (int) ($customer->amount_paid ?? 0),
        ]);

        return response()->json($customers);
    }

    public function photo(User $user): BinaryFileResponse
    {
        abort_unless(! $user->is_admin && ! $user->is_driver && $user->phone !== null, 404);
        $path = $user->profile_photo_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path), [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        abort_unless(! $user->is_admin && ! $user->is_driver && $user->phone !== null, 404);

        $proofPaths = [];
        $profilePhotoPath = null;
        $deletedName = $user->name;

        DB::transaction(function () use ($user, &$proofPaths, &$profilePhotoPath): void {
            $customer = User::query()->lockForUpdate()->findOrFail($user->id);
            $referrer = $customer->referred_by_user_id
                ? User::query()->lockForUpdate()->find($customer->referred_by_user_id)
                : null;

            if ($referrer && $customer->referral_qualified_at) {
                $qualifiedCount = max(0, $referrer->qualified_referrals_count - 1);
                $changes = ['qualified_referrals_count' => $qualifiedCount];
                if ($qualifiedCount < $this->referralThreshold()
                    && $referrer->referral_reward_used_at === null) {
                    $changes['referral_reward_earned_at'] = null;
                }
                $referrer->forceFill($changes)->save();
            }

            $orders = Order::query()->where('user_id', $customer->id)->with('items')->lockForUpdate()->get();
            $proofPaths = $orders->pluck('payment_proof_path')->filter()->all();
            $stock = app(OrderStock::class);
            foreach ($orders as $order) {
                $stock->release($order);
                $order->delete();
            }
            $profilePhotoPath = $customer->profile_photo_path;
            $customer->delete();
        });

        foreach (array_filter([...$proofPaths, $profilePhotoPath]) as $path) {
            if (! Storage::disk('local')->delete($path)) {
                Log::warning('A customer file could not be removed after deleting the account.', [
                    'customer_id' => $user->id,
                    'path' => $path,
                ]);
            }
        }

        return response()->json(['message' => "Le compte de {$deletedName} et ses données associées ont été supprimés."]);
    }

    public function announcements(): JsonResponse
    {
        return response()->json([
            'announcements' => CustomerAnnouncement::query()->with('product')->latest()->get()
                ->map(fn (CustomerAnnouncement $announcement): array => $this->presentAnnouncement($announcement)),
        ]);
    }

    public function announcementImage(CustomerAnnouncement $announcement): BinaryFileResponse
    {
        $path = $announcement->image_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path), [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function storeAnnouncement(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'min:2', 'max:160'],
            'body' => ['required', 'string', 'min:2', 'max:5000'],
            'published' => ['required', 'boolean'],
            'product_id' => ['nullable', 'integer', Rule::exists('products', 'id')->where('active', true)],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $image = $request->file('image');
        unset($data['image']);
        if ($image) {
            $data['image_path'] = $image->store('customer-announcements', 'local');
        }
        $data['admin_id'] = $request->user()->id;
        $data['published_at'] = $data['published'] ? now() : null;

        try {
            $announcement = CustomerAnnouncement::create($data)->load('product');
        } catch (\Throwable $exception) {
            if (! empty($data['image_path']) && ! Storage::disk('local')->delete($data['image_path'])) {
                Log::warning('An announcement image could not be removed after a failed save.', ['path' => $data['image_path']]);
            }
            throw $exception;
        }

        return response()->json(['announcement' => $this->presentAnnouncement($announcement)], 201);
    }

    public function updateAnnouncement(Request $request, CustomerAnnouncement $announcement): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'min:2', 'max:160'],
            'body' => ['required', 'string', 'min:2', 'max:5000'],
            'published' => ['required', 'boolean'],
            'product_id' => ['nullable', 'integer', Rule::exists('products', 'id')->where('active', true)],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $oldImagePath = $announcement->image_path;
        $image = $request->file('image');
        unset($data['image']);
        if ($image) {
            $data['image_path'] = $image->store('customer-announcements', 'local');
        }
        $data['published_at'] = $data['published']
            ? ($announcement->published_at ?? now())
            : null;
        $announcement->update($data);
        if ($image && $oldImagePath && ! Storage::disk('local')->delete($oldImagePath)) {
            Log::warning('A replaced announcement image could not be removed.', ['path' => $oldImagePath]);
        }

        return response()->json(['announcement' => $this->presentAnnouncement($announcement->refresh()->load('product'))]);
    }

    public function destroyAnnouncement(CustomerAnnouncement $announcement): JsonResponse
    {
        $imagePath = $announcement->image_path;
        $announcement->delete();
        if ($imagePath && ! Storage::disk('local')->delete($imagePath)) {
            Log::warning('An announcement image could not be removed after deleting the announcement.', [
                'announcement_id' => $announcement->id,
                'path' => $imagePath,
            ]);
        }

        return response()->json(['message' => 'Annonce supprimée.']);
    }

    private function presentAnnouncement(CustomerAnnouncement $announcement): array
    {
        return [
            ...$announcement->toArray(),
            'image_url' => $announcement->image_path ? route('api.admin.announcements.image', $announcement) : null,
            'product' => $announcement->product ? [
                'id' => $announcement->product->id,
                'name' => $announcement->product->name,
                'category' => $announcement->product->category,
                'description' => $announcement->product->description,
                'price' => $announcement->product->price,
                'image_url' => $announcement->product->image_url,
                'stock' => $announcement->product->stock,
                'active' => $announcement->product->active,
            ] : null,
        ];
    }

    private function referralThreshold(): int
    {
        $value = \App\Models\Setting::query()->find('referral')?->value ?? [];

        return max(1, (int) ($value['threshold'] ?? 5));
    }
}
