<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Services\DriverAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DriverController extends Controller
{
    public function index(): JsonResponse
    {
        $drivers = User::query()->where('is_driver', true)->orderBy('name')->get()
            ->map(fn (User $driver): array => [
                'id' => $driver->id,
                'name' => $driver->name,
                'phone' => $driver->phone,
                'active' => $driver->driver_active,
                'current_latitude' => $driver->current_latitude,
                'current_longitude' => $driver->current_longitude,
                'location_updated_at' => $driver->location_updated_at,
                'active_deliveries_count' => $driver->assignedOrders()->whereIn('status', ['confirmed', 'preparing', 'in_delivery'])->count(),
            ]);

        return response()->json(['drivers' => $drivers]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge(['phone' => \App\Http\Controllers\Api\ClientAuthController::normalizePhone((string) $request->input('phone', ''))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:160'],
            'phone' => ['required', 'string', 'regex:/^(?:70|75|76|77|78)[0-9]{7}$/', Rule::unique('users', 'phone')],
            'password' => ['required', 'string', 'min:10', 'max:255'],
        ]);

        $driver = User::create([
            'name' => trim($data['name']),
            'email' => 'driver-'.$data['phone'].'@drivers.fatoushop.local',
            'phone' => $data['phone'],
            'password' => $data['password'],
            'is_admin' => false,
            'is_driver' => true,
            'driver_active' => true,
        ]);
        app(DriverAssignment::class)->assignWaitingOrders();

        return response()->json(['driver' => [
            'id' => $driver->id,
            'name' => $driver->name,
            'phone' => $driver->phone,
            'active' => true,
            'active_deliveries_count' => 0,
        ]], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        abort_unless($user->is_driver, 404);
        $data = $request->validate(['active' => ['required', 'boolean']]);
        if (! $data['active'] && $user->assignedOrders()->whereIn('status', ['confirmed', 'preparing', 'in_delivery'])->exists()) {
            throw ValidationException::withMessages([
                'active' => ['Ce livreur a une livraison assignée. Terminez ou réassignez-la avant de le désactiver.'],
            ]);
        }

        $user->forceFill(['driver_active' => $data['active']])->save();
        if ($data['active']) {
            app(DriverAssignment::class)->assignWaitingOrders();
        }

        return response()->json(['active' => $user->driver_active]);
    }

    public function destroy(User $user): JsonResponse
    {
        abort_unless($user->is_driver, 404);
        DB::transaction(function () use ($user): void {
            $driver = User::query()->lockForUpdate()->findOrFail($user->id);
            if ($driver->assignedOrders()->whereIn('status', ['confirmed', 'preparing', 'in_delivery'])->exists()) {
                throw ValidationException::withMessages([
                    'driver' => ['Ce livreur a une livraison assignée et ne peut pas être supprimé.'],
                ]);
            }
            $driver->assignedOrders()->update(['driver_id' => null]);
            $driver->delete();
        });

        return response()->json(['message' => 'Livreur supprimé.']);
    }
}
