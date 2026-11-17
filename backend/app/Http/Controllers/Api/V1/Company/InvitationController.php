<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Enums\SystemRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Company\InviteMemberRequest;
use App\Http\Resources\V1\InvitationResource;
use App\Models\Invitation;
use App\Models\User;
use App\Services\Company\InvitationService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class InvitationController extends Controller
{
    public function __construct(private readonly InvitationService $invitations) {}

    /** GET /company/invitations (pending only) */
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Invitation::class);

        return InvitationResource::collection(
            Invitation::query()->pending()->with('inviter')->latest()->get(),
        );
    }

    /** POST /company/invitations */
    public function store(InviteMemberRequest $request): InvitationResource
    {
        Gate::authorize('create', Invitation::class);

        /** @var User $actor */
        $actor = $request->user();
        $invitation = $this->invitations->invite(
            $request->string('email')->value(),
            SystemRole::from($request->string('role')->value()),
            $actor,
        );

        return new InvitationResource($invitation->load('inviter'));
    }

    /** DELETE /company/invitations/{invitation} (tenant-scoped binding) */
    public function destroy(Invitation $invitation): Response
    {
        Gate::authorize('delete', $invitation);
        $this->invitations->revoke($invitation);

        return response()->noContent();
    }
}
