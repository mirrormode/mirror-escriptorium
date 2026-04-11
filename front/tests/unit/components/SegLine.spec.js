/**
 * Tests for SegLine watcher fixes.
 *
 * Bug 4 — mask watcher crashes when segmenterObject is null:
 *   segmenterObject starts as null and is only assigned once line.loaded
 *   becomes true.  If a server-push mask recalculation arrives before that
 *   moment, the watcher fires and calls this.segmenterObject.update(…) on
 *   null, throwing a TypeError.
 *   Fix: guard the call with `&& this.segmenterObject`.
 */

import SegLine from "../../../vue/components/SegLine.vue";

// lodash is expected as a global in the component.
global._ = require("lodash");

const maskWatcher = SegLine.options
    ? SegLine.options.watch["line.mask"]
    : SegLine.watch["line.mask"];

describe("SegLine line.mask watcher (Bug 4 — null segmenterObject guard)", () => {
    it("does not throw when segmenterObject is null and mask changes", () => {
        const ctx = { segmenterObject: null };
        expect(() =>
            maskWatcher.call(ctx, [[0, 0], [1, 1]], null),
        ).not.toThrow();
    });

    it("calls segmenterObject.update when segmenterObject is set and mask changes", () => {
        const update = jest.fn();
        const ctx = { segmenterObject: { update } };
        const newMask = [[0, 0], [1, 0], [1, 1]];

        maskWatcher.call(ctx, newMask, null);

        expect(update).toHaveBeenCalledWith(undefined, newMask);
    });

    it("does not call update when new and old masks are equal", () => {
        const update = jest.fn();
        const ctx = { segmenterObject: { update } };
        const mask = [[0, 0], [1, 1]];

        maskWatcher.call(ctx, mask, mask);

        expect(update).not.toHaveBeenCalled();
    });

    it("does not call update when segmenterObject is null, even if masks differ", () => {
        // This is the core of the bug fix — previously this would throw.
        const ctx = { segmenterObject: null };
        // Should silently do nothing.
        maskWatcher.call(ctx, [[5, 5]], [[0, 0]]);
        // No assertion needed beyond "did not throw" (tested above); this
        // test documents the intended no-op behaviour explicitly.
        expect(true).toBe(true);
    });
});
