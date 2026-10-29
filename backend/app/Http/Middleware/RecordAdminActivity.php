<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\AdminActivityRecorder;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RecordAdminActivity
{
    public function __construct(private readonly AdminActivityRecorder $recorder)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        /** @var User|null $actor */
        $actor = $request->user();
        $response = $next($request);

        if ($actor?->is_admin && ! in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            $action = $request->route()?->getName()
                ?? strtoupper($request->method()).' '.$request->path();

            $this->recorder->record($request, $action, $actor, $response->getStatusCode());
        }

        return $response;
    }
}
