<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use App\Services\AdminActivityRecorder;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ClientAuthController extends Controller
{
    public function register(Request $request, AdminActivityRecorder $activity): JsonResponse
    {
        $request->merge(['phone' => $this->cleanPhoneInput((string) $request->input('phone', ''))]);

        if ($request->filled('referral_code')) {
            $request->merge(['referral_code' => Str::upper(trim((string) $request->input('referral_code')))]);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:160'],
            'phone' => ['required', 'string', 'max:25', 'regex:/^(?:\+?221)?(?:70|75|76|77|78)[0-9]{7}$/'],
            'password' => ['required', 'string', 'min:10', 'max:255', 'confirmed'],
            'referral_code' => ['nullable', 'string', 'max:20', Rule::exists('users', 'referral_code')],
        ]);
        $phone = self::normalizePhone($data['phone']);

        if (User::query()->where('phone', $phone)->exists()) {
            throw ValidationException::withMessages([
                'phone' => ['Un compte existe déjà pour ce numéro. Connectez-vous plutôt.'],
            ]);
        }

        $referrer = isset($data['referral_code'])
            ? User::query()->where('referral_code', Str::upper($data['referral_code']))
                ->where('is_admin', false)->where('is_driver', false)->first()
            : null;

        if (isset($data['referral_code']) && ! $referrer) {
            throw ValidationException::withMessages([
                'referral_code' => ['Ce code de parrainage est invalide.'],
            ]);
        }

        if ($referrer && $referrer->phone === $phone) {
            throw ValidationException::withMessages([
                'referral_code' => ['Vous ne pouvez pas utiliser votre propre code de parrainage.'],
            ]);
        }

        $user = User::create([
            'name' => trim($data['name']),
            'email' => 'client-'.$phone.'@customers.fatoushop.local',
            'phone' => $phone,
            'password' => $data['password'],
            'is_admin' => false,
            'is_driver' => false,
            'referral_code' => $this->newReferralCode(),
            'referred_by_user_id' => $referrer?->id,
        ]);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $activity->record($request, 'client.register.succeeded', $user, 201, $phone);

        return $this->authenticatedResponse($user, 201);
    }

    public function login(Request $request, AdminActivityRecorder $activity): JsonResponse
    {
        $request->merge(['phone' => $this->cleanPhoneInput((string) $request->input('phone', ''))]);

        $data = $request->validate([
            'phone' => ['required', 'string', 'max:25', 'regex:/^(?:\+?221)?(?:70|75|76|77|78)[0-9]{7}$/'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        if (! Auth::guard('web')->attempt([
            'phone' => self::normalizePhone($data['phone']),
            'password' => $data['password'],
            'is_admin' => false,
            'is_driver' => false,
        ], false)) {
            $activity->record(
                $request,
                'client.login.failed',
                status: 422,
                actorLabel: self::normalizePhone($data['phone']),
            );
            throw ValidationException::withMessages([
                'phone' => ['Numéro ou mot de passe incorrect.'],
            ]);
        }

        $request->session()->regenerate();
        $activity->record($request, 'client.login.succeeded', $request->user(), 200, $request->user()->phone);

        return $this->authenticatedResponse($request->user());
    }

    public function logout(Request $request, AdminActivityRecorder $activity): JsonResponse
    {
        $activity->record($request, 'client.logout', $request->user(), 200, $request->user()?->phone);
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Vous êtes déconnecté.']);
    }

    public function claimPendingOrder(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $orderId = $request->session()->get('client_claimable_order_id');
        if (! $orderId) {
            throw ValidationException::withMessages([
                'order' => ['Aucune commande récente à rattacher à votre espace client.'],
            ]);
        }

        $order = DB::transaction(function () use ($orderId, $user): Order {
            $order = Order::query()->lockForUpdate()->find($orderId);
            if (! $order
                || self::normalizePhone($order->customer_phone) !== $user->phone
                || ($order->user_id !== null && $order->user_id !== $user->id)) {
                throw ValidationException::withMessages([
                    'order' => ['Cette commande ne peut pas être associée à ce compte.'],
                ]);
            }

            if ($order->user_id === null) {
                $order->user_id = $user->id;
                $order->save();
            }

            return $order;
        });

        $request->session()->forget('client_claimable_order_id');

        return response()->json(['order' => ['id' => $order->id, 'reference' => $order->reference]]);
    }

    public function updateProfilePhoto(Request $request): JsonResponse
    {
        $data = $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'],
        ]);
        /** @var User $user */
        $user = $request->user();
        $newPath = $data['photo']->store('customer-profiles', 'local');
        $oldPath = $user->profile_photo_path;
        $user->forceFill(['profile_photo_path' => $newPath])->save();

        if ($oldPath && ! Storage::disk('local')->delete($oldPath)) {
            Log::warning('A replaced customer profile photo could not be removed.', [
                'customer_id' => $user->id,
                'path' => $oldPath,
            ]);
        }

        return response()->json(['photo_url' => route('api.client.photo')]);
    }

    public function photo(Request $request): BinaryFileResponse
    {
        $path = $request->user()->profile_photo_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path), [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public static function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone) ?? '';
        return str_starts_with($digits, '221') ? substr($digits, 3) : $digits;
    }

    private function cleanPhoneInput(string $phone): string
    {
        return preg_replace('/[\s().-]/', '', $phone) ?? '';
    }

    private function authenticatedResponse(User $user, int $status = 200): JsonResponse
    {
        return response()->json([
            'user' => $this->present($user),
            'csrf_token' => csrf_token(),
        ], $status);
    }

    private function present(User $user): array
    {
        $settings = Setting::query()->find('referral')?->value ?? ['threshold' => 5, 'discount_percent' => 5];

        return [
            'id' => $user->id,
            'name' => $user->name,
            'phone' => $user->phone,
            'referral_code' => $user->referral_code,
            'qualified_referrals_count' => $user->qualified_referrals_count,
            'referral_reward_available' => $user->referral_reward_earned_at !== null && $user->referral_reward_used_at === null,
            'referral_reward_earned_at' => $user->referral_reward_earned_at,
            'referral_threshold' => (int) ($settings['threshold'] ?? 5),
            'referral_discount_percent' => (int) ($settings['discount_percent'] ?? 5),
        ];
    }

    private function newReferralCode(): string
    {
        do {
            $code = Str::upper(Str::random(8));
        } while (User::query()->where('referral_code', $code)->exists());

        return $code;
    }
}
