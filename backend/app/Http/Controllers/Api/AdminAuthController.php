<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use App\Services\AdminActivityRecorder;

class AdminAuthController extends Controller
{
    public function login(Request $request, AdminActivityRecorder $activity): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email:rfc', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        if (! Auth::guard('web')->attempt($credentials + ['is_admin' => true, 'admin_active' => true], false)) {
            $activity->record($request, 'admin.login.failed', status: 422, actorLabel: $credentials['email']);
            throw ValidationException::withMessages([
                'email' => ['Adresse e-mail ou mot de passe incorrect.'],
            ]);
        }

        $request->session()->regenerate();
        $activity->record($request, 'admin.login.succeeded', Auth::guard('web')->user(), 200);

        return response()->json([
            'user' => $request->user()->only(['id', 'name', 'email', 'is_superadmin']),
            'csrf_token' => csrf_token(),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->only(['id', 'name', 'email', 'is_superadmin']),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Session administrateur fermée.']);
    }
}
