<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ProductImageController extends Controller
{
    public function __invoke(Product $product): BinaryFileResponse
    {
        $path = $product->image_path;

        abort_unless(
            $path && Str::startsWith($path, 'products/') && Storage::disk('public')->exists($path),
            404,
        );

        return response()->file(Storage::disk('public')->path($path), [
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
