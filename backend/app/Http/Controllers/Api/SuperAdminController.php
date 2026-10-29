<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminActivity;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\AdminActivityRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SuperAdminController extends Controller
{
    public function login(Request $request, AdminActivityRecorder $activity): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email:rfc', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        if (! Auth::guard('web')->attempt(
            $credentials + ['is_admin' => true, 'is_superadmin' => true, 'admin_active' => true],
            false,
        )) {
            $activity->record($request, 'superadmin.login.failed', status: 422, actorLabel: $credentials['email']);
            throw ValidationException::withMessages([
                'email' => ['Identifiants superadmin incorrects.'],
            ]);
        }

        $request->session()->regenerate();
        $activity->record($request, 'superadmin.login.succeeded', Auth::guard('web')->user(), 200);

        return response()->json([
            'user' => $request->user()->only(['id', 'name', 'email']),
            'csrf_token' => csrf_token(),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->only(['id', 'name', 'email']),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Session superadmin fermée.']);
    }

    public function dashboard(): JsonResponse
    {
        $todayOrders = Order::query()->whereDate('created_at', today());

        return response()->json([
            'metrics' => [
                'orders' => Order::count(),
                'orders_today' => (clone $todayOrders)->count(),
                'orders_pending' => Order::where('status', 'pending')->count(),
                'payments_to_review' => Order::where('payment_status', 'submitted')->count(),
                'payments_verified' => Order::where('payment_status', 'verified')->count(),
                'revenue_verified' => Order::where('payment_status', 'verified')->sum('total'),
                'products' => Product::count(),
                'clients' => User::whereNotNull('phone')->where('is_admin', false)->where('is_driver', false)->count(),
                'admins' => User::where('is_admin', true)->where('is_superadmin', false)->where('admin_active', true)->count(),
                'admins_total' => User::where('is_admin', true)->where('is_superadmin', false)->count(),
            ],
            'latest_orders' => Order::query()
                ->select([
                    'id', 'reference', 'customer_name', 'customer_phone', 'delivery_zone_name',
                    'delivery_address', 'total', 'status', 'payment_status', 'payment_method',
                    'created_at', 'driver_id',
                ])
                ->with(['items', 'driver:id,name,phone'])
                ->latest()
                ->limit(12)
                ->get(),
            'latest_activity' => AdminActivity::query()->latest()->limit(8)->get(),
        ]);
    }

    public function admins(): JsonResponse
    {
        return response()->json(
            User::query()
                ->where('is_admin', true)
                ->where('is_superadmin', false)
                ->orderBy('name')
                ->paginate(50, ['id', 'name', 'email', 'admin_active', 'created_at']),
        );
    }

    public function createAdmin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:14', 'confirmed'],
        ]);

        $admin = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'is_admin' => true,
            'is_superadmin' => false,
            'admin_active' => true,
        ]);

        return response()->json([
            'admin' => $admin->only(['id', 'name', 'email', 'admin_active', 'created_at']),
        ], 201);
    }

    public function updateAdmin(Request $request, User $user): JsonResponse
    {
        abort_unless($user->is_admin && ! $user->is_superadmin, 404);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => [
                'sometimes', 'required', 'email:rfc', 'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'password' => ['sometimes', 'required', 'string', 'min:14', 'confirmed'],
            'admin_active' => ['sometimes', 'required', 'boolean'],
        ]);

        $user->fill($data)->save();

        return response()->json([
            'admin' => $user->only(['id', 'name', 'email', 'admin_active', 'created_at']),
        ]);
    }

    public function activity(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['sometimes', 'string', 'max:120'],
            'account' => ['sometimes', 'string', 'max:255'],
        ]);

        $events = AdminActivity::query()
            ->when($data['action'] ?? null, fn ($query, $action) => $query->where('action', 'like', '%'.$action.'%'))
            ->when($data['account'] ?? null, fn ($query, $account) => $query->where('actor_label', $account))
            ->latest()
            ->paginate(50);

        return response()->json($events);
    }

    public function orders(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', 'string', Rule::in(['pending', 'confirmed', 'preparing', 'in_delivery', 'delivered', 'cancelled'])],
            'payment_status' => ['sometimes', 'string', Rule::in(['unpaid', 'submitted', 'verified', 'rejected'])],
        ]);

        return response()->json(
            Order::query()
                ->select([
                    'id', 'reference', 'customer_name', 'customer_phone', 'delivery_zone_name',
                    'delivery_address', 'total', 'status', 'payment_status', 'payment_method',
                    'created_at', 'driver_id',
                ])
                ->with(['items', 'driver:id,name,phone'])
                ->when($data['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
                ->when($data['payment_status'] ?? null, fn ($query, $status) => $query->where('payment_status', $status))
                ->latest()
                ->paginate(50),
        );
    }
}
