<?php

namespace App\Http\Controllers\Api\V1\Candidates;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class TagController extends Controller
{
    /** GET /tags: the company's candidate tags. */
    public function index(): JsonResponse
    {
        Gate::authorize('viewAny', Candidate::class);

        return response()->json(['data' => Tag::query()->orderBy('name')->limit(200)->get(['id', 'name'])]);
    }
}
