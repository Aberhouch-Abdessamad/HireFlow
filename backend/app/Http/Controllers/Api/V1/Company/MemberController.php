<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Enums\SystemRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Company\UpdateMemberRoleRequest;
use App\Http\Resources\V1\MemberResource;
use App\Models\Membership;
use App\Models\User;
use App\Services\Company\MembershipService;
use App\Support\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class MemberController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenant,
        private readonly MembershipService $memberships,
    ) {}

    /** GET /company/members?search=&status=&page=&per_page= */
    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Membership::class);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:active,deactivated'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $members = Membership::query()
            ->where('company_user.company_id', $this->tenant->id())
            ->with('user.roles')
            ->when($validated['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($validated['search'] ?? null, function ($q, string $search): void {
                $q->whereHas('user', function ($u) use ($search): void {
                    $u->where('name', 'like', '%'.$search.'%')->orWhere('email', 'like', '%'.$search.'%');
                });
            })
            ->orderBy('company_user.id')
            ->paginate($validated['per_page'] ?? 25)
            ->withQueryString();

        return MemberResource::collection($members);
    }

    /** PUT /company/members/{id}/role */
    public function updateRole(UpdateMemberRoleRequest $request, int $id): MemberResource
    {
        $membership = $this->find($id);
        Gate::authorize('update', $membership);

        /** @var User $actor */
        $actor = $request->user();
        $membership = $this->memberships->changeRole($membership, SystemRole::from($request->string('role')->value()), $actor);

        return new MemberResource($membership->load('user.roles'));
    }

    /** DELETE /company/members/{id}: deactivates the membership (history is kept). */
    public function destroy(Request $request, int $id): MemberResource
    {
        $membership = $this->find($id);
        Gate::authorize('update', $membership);

        /** @var User $actor */
        $actor = $request->user();

        return new MemberResource($this->memberships->deactivate($membership, $actor)->load('user.roles'));
    }

    /** POST /company/members/{id}/activate */
    public function activate(int $id): MemberResource
    {
        $membership = $this->find($id);
        Gate::authorize('update', $membership);

        return new MemberResource($this->memberships->activate($membership)->load('user.roles'));
    }

    /** Tenant-scoped lookup: members of other companies are reported as 404. */
    private function find(int $id): Membership
    {
        return Membership::query()
            ->where('company_user.company_id', $this->tenant->id())
            ->findOrFail($id);
    }
}
