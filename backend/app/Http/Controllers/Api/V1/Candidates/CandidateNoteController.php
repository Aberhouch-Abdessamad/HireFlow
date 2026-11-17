<?php

namespace App\Http\Controllers\Api\V1\Candidates;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\NoteResource;
use App\Models\Candidate;
use App\Models\User;
use App\Services\Candidates\CandidateService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class CandidateNoteController extends Controller
{
    /** GET /candidates/{candidate}/notes */
    public function index(Candidate $candidate): AnonymousResourceCollection
    {
        Gate::authorize('view', $candidate);

        return NoteResource::collection($candidate->notes()->with('author')->limit(200)->get());
    }

    /** POST /candidates/{candidate}/notes */
    public function store(Request $request, Candidate $candidate, CandidateService $service): NoteResource
    {
        Gate::authorize('update', $candidate);
        $validated = $request->validate(['body' => ['required', 'string', 'min:1', 'max:5000']]);

        /** @var User $author */
        $author = $request->user();

        return new NoteResource($service->addNote($candidate, $validated['body'], $author)->load('author'));
    }
}
