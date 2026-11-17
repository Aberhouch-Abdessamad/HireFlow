<?php

namespace App\Http\Controllers\Api\V1\Jobs;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Jobs\DepartmentRequest;
use App\Http\Resources\V1\DepartmentResource;
use App\Models\Department;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class DepartmentController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    /** GET /departments */
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Department::class);

        return DepartmentResource::collection(
            Department::query()->withCount('jobPostings')->orderBy('name')->get(),
        );
    }

    /** POST /departments */
    public function store(DepartmentRequest $request): DepartmentResource
    {
        Gate::authorize('create', Department::class);

        $department = Department::create($request->validated());
        $this->audit->record('department.created', $department, null, ['name' => $department->name]);

        return new DepartmentResource($department->loadCount('jobPostings'));
    }

    /** PUT /departments/{department} */
    public function update(DepartmentRequest $request, Department $department): DepartmentResource
    {
        Gate::authorize('update', $department);

        $old = $department->only(['name', 'description']);
        $department->update($request->validated());
        $this->audit->record('department.updated', $department, $old, $department->only(['name', 'description']));

        return new DepartmentResource($department->loadCount('jobPostings'));
    }

    /** DELETE /departments/{department}: jobs keep existing, without a department. */
    public function destroy(Department $department): Response
    {
        Gate::authorize('delete', $department);

        $department->delete();
        $this->audit->record('department.deleted', $department, ['name' => $department->name], null);

        return response()->noContent();
    }
}
