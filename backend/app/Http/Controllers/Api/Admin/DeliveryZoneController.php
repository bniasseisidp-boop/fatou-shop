<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DeliveryZoneController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'delivery_zones' => DeliveryZone::query()->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120', 'unique:delivery_zones,name'],
            'fee' => ['required', 'integer', 'min:0', 'max:10000000'],
            'active' => ['required', 'boolean'],
        ]);

        return response()->json(['delivery_zone' => DeliveryZone::create($data)], 201);
    }

    public function update(Request $request, DeliveryZone $deliveryZone): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120', Rule::unique('delivery_zones', 'name')->ignore($deliveryZone->id)],
            'fee' => ['required', 'integer', 'min:0', 'max:10000000'],
            'active' => ['required', 'boolean'],
        ]);
        $deliveryZone->update($data);

        return response()->json(['delivery_zone' => $deliveryZone->refresh()]);
    }

    public function destroy(DeliveryZone $deliveryZone): JsonResponse
    {
        $deliveryZone->delete();

        return response()->json(['message' => 'Zone de livraison supprimée.']);
    }
}
