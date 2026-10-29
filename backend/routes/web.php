<?php

use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\CustomerManagementController;
use App\Http\Controllers\Api\Admin\DeliveryZoneController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\ProductController;
use App\Http\Controllers\Api\Admin\ReferralController;
use App\Http\Controllers\Api\Admin\SettingsController;
use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\ClientAuthController;
use App\Http\Controllers\Api\ClientDashboardController;
use App\Http\Controllers\Api\ClientTrackingController;
use App\Http\Controllers\Api\CsrfTokenController;
use App\Http\Controllers\Api\DriverAuthController;
use App\Http\Controllers\Api\DriverDashboardController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductImageController;
use App\Http\Controllers\Api\StorefrontController;
use App\Http\Controllers\Api\SuperAdminController;
use App\Http\Controllers\Api\Admin\DriverController;
use App\Http\Middleware\RecordAdminActivity;
use Illuminate\Support\Facades\Route;

Route::prefix('api')->name('api.')->group(function (): void {
    Route::get('/csrf-token', CsrfTokenController::class)->name('csrf-token');
    Route::get('/storefront', StorefrontController::class)->name('storefront');
    Route::get('/products/{product}/image', ProductImageController::class)
        ->whereNumber('product')
        ->name('products.image');
    Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:10,1')->name('orders.store');
    Route::post('/client/register', [ClientAuthController::class, 'register'])->middleware('throttle:6,1')->name('client.register');
    Route::post('/client/login', [ClientAuthController::class, 'login'])->middleware('throttle:6,1')->name('client.login');
    Route::post('/driver/login', [DriverAuthController::class, 'login'])->middleware('throttle:driver-login')->name('driver.login');

    Route::post('/admin/login', [AdminAuthController::class, 'login'])
        ->middleware('throttle:admin-login')
        ->name('admin.login');
    Route::post('/superadmin/login', [SuperAdminController::class, 'login'])
        ->middleware('throttle:superadmin-login')
        ->name('superadmin.login');

    Route::middleware(['auth', 'can:manage-store', RecordAdminActivity::class])->prefix('admin')->name('admin.')->group(function (): void {
        Route::get('/me', [AdminAuthController::class, 'me'])->name('me');
        Route::post('/logout', [AdminAuthController::class, 'logout'])->name('logout');
        Route::get('/dashboard', DashboardController::class)->name('dashboard');
        Route::apiResource('products', ProductController::class);
        Route::get('/orders/{order}/proof', [AdminOrderController::class, 'proof'])
            ->whereNumber('order')
            ->name('orders.proof');
        Route::delete('/orders/{order}', [AdminOrderController::class, 'destroy'])
            ->whereNumber('order')
            ->name('orders.destroy');
        Route::get('/orders/{order}', [AdminOrderController::class, 'show'])->whereNumber('order')->name('orders.show');
        Route::patch('/orders/{order}', [AdminOrderController::class, 'update'])->whereNumber('order')->name('orders.update');
        Route::get('/orders', [AdminOrderController::class, 'index'])->name('orders.index');
        Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
        Route::put('/settings', [SettingsController::class, 'update'])->name('settings.update');
        Route::get('/referrals', [ReferralController::class, 'index'])->name('referrals.index');
        Route::put('/referrals', [ReferralController::class, 'update'])->name('referrals.update');
        Route::apiResource('drivers', DriverController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::get('/customers', [CustomerManagementController::class, 'index'])->name('customers.index');
        Route::get('/customers/{user}/photo', [CustomerManagementController::class, 'photo'])->whereNumber('user')->name('customers.photo');
        Route::delete('/customers/{user}', [CustomerManagementController::class, 'destroy'])->whereNumber('user')->name('customers.destroy');
        Route::get('/announcements', [CustomerManagementController::class, 'announcements'])->name('announcements.index');
        Route::get('/announcements/{announcement}/image', [CustomerManagementController::class, 'announcementImage'])->whereNumber('announcement')->name('announcements.image');
        Route::post('/announcements', [CustomerManagementController::class, 'storeAnnouncement'])->name('announcements.store');
        Route::patch('/announcements/{announcement}', [CustomerManagementController::class, 'updateAnnouncement'])->whereNumber('announcement')->name('announcements.update');
        Route::delete('/announcements/{announcement}', [CustomerManagementController::class, 'destroyAnnouncement'])->whereNumber('announcement')->name('announcements.destroy');
        Route::apiResource('delivery-zones', DeliveryZoneController::class)->except(['show']);
    });

    Route::middleware(['auth', 'can:manage-superadmin', RecordAdminActivity::class])
        ->prefix('superadmin')->name('superadmin.')->group(function (): void {
            Route::get('/me', [SuperAdminController::class, 'me'])->name('me');
            Route::post('/logout', [SuperAdminController::class, 'logout'])->name('logout');
            Route::get('/dashboard', [SuperAdminController::class, 'dashboard'])->name('dashboard');
            Route::get('/admins', [SuperAdminController::class, 'admins'])->name('admins.index');
            Route::post('/admins', [SuperAdminController::class, 'createAdmin'])->name('admins.store');
            Route::patch('/admins/{user}', [SuperAdminController::class, 'updateAdmin'])->whereNumber('user')->name('admins.update');
            Route::get('/activity', [SuperAdminController::class, 'activity'])->name('activity.index');
            Route::get('/orders', [SuperAdminController::class, 'orders'])->name('orders.index');
        });

    Route::middleware(['auth', 'can:manage-client'])->prefix('client')->name('client.')->group(function (): void {
        Route::get('/me', [ClientDashboardController::class, 'me'])->name('me');
        Route::get('/dashboard', [ClientDashboardController::class, 'dashboard'])->name('dashboard');
        Route::get('/announcements/{announcement}/image', [ClientDashboardController::class, 'announcementImage'])->whereNumber('announcement')->name('announcements.image');
        Route::post('/orders/claim-pending', [ClientAuthController::class, 'claimPendingOrder'])->name('orders.claim-pending');
        Route::post('/profile/photo', [ClientAuthController::class, 'updateProfilePhoto'])->name('profile.photo.update');
        Route::get('/profile/photo', [ClientAuthController::class, 'photo'])->name('photo');
        Route::get('/orders/{order}/proof', [ClientDashboardController::class, 'proof'])
            ->whereNumber('order')
            ->name('orders.proof');
        Route::get('/orders/{order}/tracking', [ClientTrackingController::class, 'show'])
            ->whereNumber('order')
            ->name('orders.tracking');
        Route::post('/logout', [ClientAuthController::class, 'logout'])->name('logout');
    });

    Route::middleware(['auth', 'can:manage-driver'])->prefix('driver')->name('driver.')->group(function (): void {
        Route::get('/me', [DriverAuthController::class, 'me'])->name('me');
        Route::get('/dashboard', [DriverDashboardController::class, 'dashboard'])->name('dashboard');
        Route::post('/location', [DriverDashboardController::class, 'updateLocation'])->middleware('throttle:60,1')->name('location');
        Route::post('/orders/{order}/start', [DriverDashboardController::class, 'start'])->whereNumber('order')->name('orders.start');
        Route::post('/orders/{order}/delivered', [DriverDashboardController::class, 'delivered'])->whereNumber('order')->name('orders.delivered');
        Route::post('/logout', [DriverAuthController::class, 'logout'])->name('logout');
    });
});

Route::get('/', fn () => view('welcome'));
Route::get('/admin', fn () => view('welcome'));
Route::get('/superadmin', fn () => view('welcome'));
Route::get('/client', fn () => view('welcome'));
Route::get('/driver', fn () => view('welcome'));
