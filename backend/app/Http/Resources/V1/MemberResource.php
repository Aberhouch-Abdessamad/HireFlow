<?php

namespace App\Http\Resources\V1;

use App\Enums\SystemRole;
use App\Models\Membership;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A company member (membership + user). Load `user.roles` while the company's team is active.
 *
 * @mixin Membership
 */
class MemberResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $roleName = $this->user->roles->first()?->name;
        $role = $roleName !== null ? SystemRole::tryFrom($roleName) : null;

        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'job_title' => $this->job_title,
            'joined_at' => $this->joined_at?->toIso8601String(),
            'role' => $role?->value,
            'role_label' => $role?->label(),
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'is_active' => $this->user->is_active,
                'last_login_at' => $this->user->last_login_at?->toIso8601String(),
            ],
        ];
    }
}
