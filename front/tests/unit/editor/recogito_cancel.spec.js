/**
 * Regression test for the crash in @recogito/recogito-js when pressing Escape
 * with no active annotation selection.
 *
 * Root cause:
 *   TextAnnotator.handleEscape fires on keydown(27) → onCancelAnnotation() with
 *   no argument → handleCancelSelected(undefined) → crashes on annotation.underlying.
 *
 * Fix: DiploPanel.initAnnotations wraps _emitter.emit on the created Recogito instance
 *   to silently drop 'cancelSelected' calls where data is undefined.
 */

import DiploPanel from "../../../vue/components/DiploPanel.vue";

jest.mock("@recogito/recogito-js", () => ({
    Recogito: jest.fn(),
}));

import { Recogito } from "@recogito/recogito-js";

describe("DiploPanel initAnnotations — cancelSelected null guard", () => {
    let originalEmit;
    let ctx;

    beforeEach(() => {
        const instance = {
            _emitter: { emit: jest.fn() },
            _appContainerEl: document.createElement("div"),
            on: jest.fn(),
        };
        // Capture before initAnnotations replaces _emitter.emit with the wrapper
        originalEmit = instance._emitter.emit;

        Recogito.mockImplementation(() => instance);

        ctx = {
            anno: null,
            $refs: { contentContainer: document.createElement("div") },
            textAnnoFormatter: jest.fn(),
            isEditorOpen: false,
            setBlockShortcuts: jest.fn(),
            currentTaxonomy: null,
        };

        DiploPanel.methods.initAnnotations.call(ctx);
    });

    it("does not throw when cancelSelected is emitted with undefined", () => {
        expect(() =>
            ctx.anno._emitter.emit("cancelSelected", undefined),
        ).not.toThrow();
    });

    it("does not forward cancelSelected to the emitter when data is undefined", () => {
        ctx.anno._emitter.emit("cancelSelected", undefined);
        expect(originalEmit).not.toHaveBeenCalled();
    });

    it("forwards cancelSelected normally when annotation is provided", () => {
        const underlying = { id: "anno-1", type: "Annotation" };
        ctx.anno._emitter.emit("cancelSelected", underlying);
        expect(originalEmit).toHaveBeenCalledWith("cancelSelected", underlying);
    });

    it("forwards unrelated events unchanged", () => {
        ctx.anno._emitter.emit("createAnnotation", { id: "anno-2" });
        expect(originalEmit).toHaveBeenCalledWith("createAnnotation", { id: "anno-2" });
    });
});
