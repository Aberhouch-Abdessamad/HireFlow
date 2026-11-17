<?php

namespace App\Http\Requests\V1\Analytics;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/**
 * Shared date-range filter for /dashboard/overview and the /analytics/* endpoints.
 *
 * Presets mirror the dashboard filter buttons: today, last 7/30/90 days, or a
 * custom from/to window. Defaults to the last 30 days.
 */
class DateRangeRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Enforced by the controller with Gate::authorize so unauthorized responses
        // keep the same JSON shape as every other permission failure.
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'range' => ['nullable', Rule::in(['today', '7', '30', '90', 'custom'])],
            'from' => ['nullable', 'required_if:range,custom', 'date'],
            'to' => ['nullable', 'required_if:range,custom', 'date', 'after_or_equal:from'],
        ];
    }

    /**
     * Resolves the analysed period as [from, to] with the preset echoed back.
     * `from` starts at the beginning of a day, `to` at the end, so day-filter
     * boundaries always include their whole day.
     *
     * @return array{from: Carbon, to: Carbon, preset: string}
     */
    public function period(): array
    {
        $preset = $this->validated('range') ?? '30';

        if ($preset === 'custom') {
            return [
                'from' => Carbon::parse((string) $this->validated('from'))->startOfDay(),
                'to' => Carbon::parse((string) $this->validated('to'))->endOfDay(),
                'preset' => 'custom',
            ];
        }

        if ($preset === 'today') {
            return [
                'from' => now()->startOfDay(),
                'to' => now()->endOfDay(),
                'preset' => 'today',
            ];
        }

        return [
            'from' => now()->subDays((int) $preset)->startOfDay(),
            'to' => now()->endOfDay(),
            'preset' => $preset,
        ];
    }
}
