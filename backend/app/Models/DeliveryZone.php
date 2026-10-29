<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'fee', 'active'])]
class DeliveryZone extends Model
{
    protected function casts(): array
    {
        return [
            'fee' => 'integer',
            'active' => 'boolean',
        ];
    }
}
