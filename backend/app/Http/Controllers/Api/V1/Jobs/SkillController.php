<?php

namespace App\Http\Controllers\Api\V1\Jobs;

use App\Http\Controllers\Controller;
use App\Models\Skill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SkillController extends Controller
{
    /** GET /skills?search=: the company's skill catalogue (for autocomplete). */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate(['search' => ['nullable', 'string', 'max:80']]);

        $skills = Skill::query()
            ->when($validated['search'] ?? null, fn ($q, string $search) => $q->where('name', 'like', '%'.$search.'%'))
            ->orderBy('name')
            ->limit(50)
            ->get(['id', 'name']);

        return response()->json(['data' => $skills]);
    }
}
