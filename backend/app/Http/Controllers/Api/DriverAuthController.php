<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use App\Services\AdminActivityRecorder;

class DriverAuthController extends Controller
{
    public function login(Request $request, AdminActivityRecorder $activity): JsonResponse
    {
        $request->merge(['phone' => ClientAuthController::normalizePhone((string) $request->input('phone', ''))]);
        $data = $request->validate([
            'phone' => ['required', 'string', 'regex:/^(?:70|75|76|77|78)[0-9]{7}$/'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        if (! Auth::guard('web')->attempt([
            'phone' => $data['phone'],
            'password' => $data['password'],
            'is_driver' => true,
            'driver_active' => true,
        ])) {
            $activity->record($request, 'driver.login.failed', status: 422, actorLabel: $data['phone']);
            throw ValidationException::withMessages([
                'phone' => ['Numéro ou mot de passe incorrect, ou compte livreur désactivé.'],
            ]);
        }

        $request->session()->regenerate();
        $activity->record($request, 'driver.login.succeeded', $request->user(), 200, $request->user()->phone);

        return response()->json(['driver' => $this->present($request->user())]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['driver' => $this->present($request->user())]);
    }

    public function logout(Request $request, AdminActivityRecorder $activity): JsonResponse
    {
        $activity->record($request, 'driver.logout', $request->user(), 200, $request->user()?->phone);
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Vous êtes déconnecté.']);
    }

    private function present(User $driver): array
    {
        return ['id' => $driver->id, 'name' => $driver->name, 'phone' => $driver->phone];
    }
}
