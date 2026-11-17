<?php

namespace App\Http\Resources\V1;

use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** @mixin Company */
class CompanyResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'website' => $this->website,
            'industry' => $this->industry,
            'size' => $this->size,
            'country' => $this->country,
            'timezone' => $this->timezone,
            'description' => $this->description,
            'logo_url' => $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
