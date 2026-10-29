<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'brand' => Setting::query()->findOrFail('brand')->value,
            'story' => Setting::query()->findOrFail('story')->value,
            'store_location' => Setting::query()->find('store_location')?->value ?? [
                'latitude' => 14.712,
                'longitude' => -17.454,
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'brand.name' => ['required', 'string', 'min:2', 'max:120'],
            'brand.email' => ['required', 'email:rfc', 'max:255'],
            'brand.phone' => ['required', 'string', 'regex:/^221(?:70|75|76|77|78)[0-9]{7}$/'],
            'brand.origin' => ['required', 'string', 'max:180'],
            'brand.tagline' => ['required', 'string', 'max:160'],
            'store_location.latitude' => ['required', 'numeric', 'between:-90,90'],
            'store_location.longitude' => ['required', 'numeric', 'between:-180,180'],
            'story.headline' => ['required', 'string', 'max:180'],
            'story.short' => ['required', 'string', 'max:500'],
            'story.description' => ['required', 'string', 'max:2000'],
        ]);

        foreach (['brand', 'story', 'store_location'] as $key) {
            Setting::updateOrCreate(['key' => $key], ['value' => $data[$key]]);
        }

        return $this->index();
    }
}
