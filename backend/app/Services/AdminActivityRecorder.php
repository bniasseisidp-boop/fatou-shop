<?php

namespace App\Services;

use App\Models\AdminActivity;
use App\Models\User;
use Illuminate\Http\Request;

class AdminActivityRecorder
{
    public function record(
        Request $request,
        string $action,
        ?User $actor = null,
        ?int $status = null,
        ?string $actorLabel = null,
    ): void {
        AdminActivity::create([
            'user_id' => $actor?->id,
            'actor_label' => $actorLabel ?? $actor?->email ?? $actor?->phone,
            'action' => $action,
            'method' => $request->method(),
            'path' => $request->path(),
            'status' => $status,
            'ip_address' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 2000),
        ]);
    }
}
