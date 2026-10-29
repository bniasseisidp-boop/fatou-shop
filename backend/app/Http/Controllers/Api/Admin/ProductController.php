<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $products = Product::query()
            ->when($request->filled('search'), fn ($query) => $query->where('name', 'like', '%'.$request->string('search')->toString().'%'))
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->string('category')->toString()))
            ->orderByDesc('updated_at')
            ->paginate(min(100, max(1, $request->integer('per_page', 20))))
            ->through(fn (Product $product): array => $this->present($product));

        return response()->json($products);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['image_path'] = $request->file('image')->store('products', 'public');

        return response()->json(['product' => $this->present(Product::create($data))], 201);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json(['product' => $this->present($product)]);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $this->validated($request, updating: true);

        if ($request->hasFile('image')) {
            $newPath = $request->file('image')->store('products', 'public');
            if ($product->image_path && ! Str::startsWith($product->image_path, ['https://', 'http://'])) {
                Storage::disk('public')->delete($product->image_path);
            }
            $data['image_path'] = $newPath;
        }

        $product->update($data);

        return response()->json(['product' => $this->present($product->refresh())]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $product = DB::transaction(function () use ($product): Product {
            $product = Product::query()->lockForUpdate()->findOrFail($product->id);
            $hasReservedOrders = $product->orderItems()
                ->whereHas('order', fn ($query) => $query->where('stock_reserved', true))
                ->exists();
            if ($hasReservedOrders) {
                throw ValidationException::withMessages([
                    'product' => ['Cet article ne peut pas être supprimé pendant qu’une commande le réserve. Annulez ou finalisez les commandes concernées.'],
                ]);
            }

            $product->delete();

            return $product;
        });
        if ($product->image_path && ! Str::startsWith($product->image_path, ['https://', 'http://'])) {
            Storage::disk('public')->delete($product->image_path);
        }

        return response()->json(['message' => 'Article supprimé.']);
    }

    private function validated(Request $request, bool $updating = false): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:180'],
            'category' => ['required', 'string', 'max:80'],
            'description' => ['required', 'string', 'max:3000'],
            'price' => ['required', 'integer', 'min:0', 'max:100000000'],
            'old_price' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'label' => ['nullable', 'string', 'max:100'],
            'image_alt' => ['nullable', 'string', 'max:180'],
            'tone' => ['nullable', 'string', 'max:40'],
            'stock' => ['required', 'integer', 'min:0', 'max:1000000'],
            'active' => ['required', 'boolean'],
            'image' => [$updating ? 'nullable' : 'required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
    }

    private function present(Product $product): array
    {
        return $product->toArray() + [
            'image_url' => $product->image_url,
            'stock_status' => $product->stock === 0 ? 'out_of_stock' : ($product->stock <= Product::LOW_STOCK_THRESHOLD ? 'low_stock' : 'in_stock'),
            'low_stock_threshold' => Product::LOW_STOCK_THRESHOLD,
        ];
    }
}
