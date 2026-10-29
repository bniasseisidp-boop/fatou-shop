<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::define('manage-store', fn (User $user): bool => $user->is_admin && ($user->admin_active ?? true));
        Gate::define('manage-superadmin', fn (User $user): bool => $user->is_admin && $user->is_superadmin && ($user->admin_active ?? true));
        Gate::define('manage-client', fn (User $user): bool => ! $user->is_admin && ! $user->is_driver && $user->phone !== null);
        Gate::define('manage-driver', fn (User $user): bool => $user->is_driver && $user->driver_active);

        RateLimiter::for('admin-login', function (Request $request): Limit {
            $identity = Str::lower((string) $request->input('email')).'|'.$request->ip();

            return Limit::perMinute(6)->by($identity);
        });
        RateLimiter::for('superadmin-login', function (Request $request): Limit {
            $identity = Str::lower((string) $request->input('email')).'|'.$request->ip();

            return Limit::perMinute(5)->by($identity);
        });
        RateLimiter::for('driver-login', function (Request $request): Limit {
            $identity = preg_replace('/\D/', '', (string) $request->input('phone')).'|'.$request->ip();

            return Limit::perMinute(6)->by($identity);
        });
    }
}
