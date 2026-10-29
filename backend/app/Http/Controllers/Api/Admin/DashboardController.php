<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $verifiedOrders = Order::query()->where('payment_status', 'verified');
        $bestCustomers = (clone $verifiedOrders)
            ->select('customer_name', 'customer_phone', DB::raw('COUNT(*) as orders_count'), DB::raw('SUM(total) as spent'))
            ->groupBy('customer_name', 'customer_phone')
            ->orderByDesc('spent')
            ->limit(5)
            ->get();

        $bestProducts = OrderItem::query()
            ->select('order_items.product_name', DB::raw('SUM(order_items.quantity) as quantity_sold'), DB::raw('SUM(order_items.line_total) as revenue'))
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.payment_status', 'verified')
            ->groupBy('order_items.product_name')
            ->orderByDesc('quantity_sold')
            ->limit(5)
            ->get();

        return response()->json([
            'metrics' => [
                'orders_total' => Order::count(),
                'orders_pending' => Order::where('status', 'pending')->count(),
                'payments_to_review' => Order::where('payment_status', 'submitted')->count(),
                'payments_verified' => Order::where('payment_status', 'verified')->count(),
                'revenue_verified' => (int) (clone $verifiedOrders)->sum('total'),
                'revenue_this_month' => (int) (clone $verifiedOrders)->whereBetween('payment_verified_at', [now()->startOfMonth(), now()->endOfMonth()])->sum('total'),
                'orders_delivered' => Order::where('status', 'delivered')->count(),
            ],
            'best_customers' => $bestCustomers,
            'best_products' => $bestProducts,
            'recent_orders' => Order::query()->withCount('items')->latest()->limit(8)->get(),
        ]);
    }
}
