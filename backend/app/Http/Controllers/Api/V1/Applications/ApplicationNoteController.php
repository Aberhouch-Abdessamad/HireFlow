<?php

namespace App\Http\Controllers\Api\V1\Applications;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\NoteResource;
use App\Models\Application;
use App\Models\User;
use App\Services\Applications\ApplicationService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class ApplicationNoteController extends Controller
{
    /** GET /applications/{application}/notes */
    public function index(Application $application): AnonymousResourceCollection
    {
        Gate::authorize('comment', $application);

        return NoteResource::collection($application->notes()->with('author')->limit(200)->get());
    }

    /** POST /applications/{application}/notes {body} */
    public function store(Request $request, Application $application, ApplicationService $service): NoteResource
    {
        Gate::authorize('comment', $application);
        $validated = $request->validate(['body' => ['required', 'string', 'min:1', 'max:5000']]);

        /** @var User $author */
        $author = $request->user();

        return new NoteResource($service->addNote($application, $validated['body'], $author)->load('author'));
    }
}
