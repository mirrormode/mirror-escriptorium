<template>
    <EscrModal
        class="escr-export-modal"
    >
        <template #modal-header>
            <h2>Export {{ scope }}</h2>
            <EscrButton
                color="text"
                :on-click="onCancel"
                size="small"
            >
                <template #button-icon>
                    <XIcon />
                </template>
            </EscrButton>
        </template>
        <template #modal-content>
            <DropdownField
                label="Transcription"
                :disabled="disabled || !transcriptions"
                :options="transcriptionOptions"
                :on-change="handleTranscriptionChange"
                required
            />
            <DropdownField
                label="File Format"
                :disabled="disabled"
                :options="fileFormatOptions"
                :on-change="handleFileFormatChange"
                required
            />
            <div class="escr-form-field escr-export-mode-field">
                <label class="escr-radio-option">
                    <input
                        type="radio"
                        name="export-mode"
                        value="full"
                        :checked="mode === 'full'"
                        @change="handleModeChange"
                    >
                    <span>
                        <strong>Full backup</strong>
                        <span class="escr-help-text">
                            Export everything the exporter can produce (all optional data
                            included). Use this when you want a complete snapshot for
                            archival or migration.
                        </span>
                    </span>
                </label>
                <label class="escr-radio-option">
                    <input
                        type="radio"
                        name="export-mode"
                        value="custom"
                        :checked="mode === 'custom'"
                        @change="handleModeChange"
                    >
                    <span>
                        <strong>Custom</strong>
                        <span class="escr-help-text">
                            Pick which optional data to include below.
                        </span>
                    </span>
                </label>
            </div>

            <fieldset
                v-if="mode === 'custom'"
                class="escr-export-custom-options"
            >
                <legend>Data</legend>
                <div class="escr-form-field escr-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            :checked="includeCharacters"
                            @change="handleIncludeCharactersChange"
                        >
                        Include character locations
                    </label>
                    <span class="escr-help-text">
                        Per-character bounding boxes. Only present for transcriptions from
                        automatic recognition; invalidated by manual edits.
                    </span>
                </div>
                <div class="escr-form-field escr-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            :checked="includeAnnotations"
                            @change="handleGenericCheckbox('includeAnnotations', $event)"
                        >
                        Include annotations
                    </label>
                    <span class="escr-help-text">
                        Image and text annotations attached to the document.
                    </span>
                </div>
                <div class="escr-form-field escr-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            :checked="includeComments"
                            @change="handleGenericCheckbox('includeComments', $event)"
                        >
                        Include user comments
                    </label>
                </div>
                <div class="escr-form-field escr-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            :checked="includeMetadata"
                            @change="handleGenericCheckbox('includeMetadata', $event)"
                        >
                        Include metadata
                    </label>
                    <span class="escr-help-text">
                        Document metadata and per-part metadata.
                    </span>
                </div>
                <div class="escr-form-field escr-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            :checked="allTranscriptions"
                            @change="handleGenericCheckbox('allTranscriptions', $event)"
                        >
                        Include all transcription layers
                    </label>
                    <span class="escr-help-text">
                        Include every layer on the document, not only the selected one.
                    </span>
                </div>
            </fieldset>

            <fieldset
                v-if="mode === 'custom'"
                class="escr-export-custom-options"
            >
                <legend>Heavy binary content</legend>
                <div class="escr-form-field escr-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            :checked="includeImages === true && fileFormat !== 'text'"
                            :disabled="fileFormat === 'text'"
                            @change="handleIncludeImagesChange"
                        >
                        Include images
                    </label>
                    <span class="escr-help-text">
                        Will significantly increase the time to produce and download the export.
                    </span>
                </div>
                <div class="escr-form-field escr-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            :checked="includeModels"
                            @change="handleGenericCheckbox('includeModels', $event)"
                        >
                        Include OCR models
                    </label>
                    <span class="escr-help-text">
                        Ships the OCR models used to produce the transcriptions.
                        Adds significant size.
                    </span>
                </div>
            </fieldset>

            <MultiSelectField
                :on-change="handleRegionTypesChange"
                :options="regionTypesOptions"
                class="escr-region-types"
                help-text="Select region types to include in the export."
                label="Region Types"
                placeholder="Select region types..."
            />
        </template>
        <template #modal-actions>
            <EscrButton
                color="outline-primary"
                label="Cancel"
                :on-click="onCancel"
                :disabled="disabled"
            />
            <EscrButton
                color="primary"
                label="Export"
                :on-click="onSubmit"
                :disabled="disabled || invalid"
            />
        </template>
    </EscrModal>
</template>
<script>
import { mapActions, mapState } from "vuex";
import MultiSelectField from "../MultiSelectDropdown/MultiSelectField.vue";
import DropdownField from "../Dropdown/DropdownField.vue";
import EscrButton from "../Button/Button.vue";
import EscrModal from "../Modal/Modal.vue";
import XIcon from "../Icons/XIcon/XIcon.vue";
import "../Common/Form.css";
import "./ExportModal.css";

export default {
    name: "EscrExportModal",
    components: {
        MultiSelectField,
        DropdownField,
        EscrButton,
        EscrModal,
        XIcon,
    },
    props: {
        /**
         * Boolean indicating whether or not the form fields should be disabled.
         */
        disabled: {
            type: Boolean,
            required: true,
        },
        /**
         * Whether or not the OpenITI Markdown export is enabled on the instance.
         */
        markdownEnabled: {
            type: Boolean,
            required: true,
        },
        /**
         * List of all region types on this document.
         */
        regionTypes: {
            type: Array,
            required: true,
        },
        /**
         * Whether or not the OpenITI TEI XML export is enabled on the instance.
         */
        teiEnabled: {
            type: Boolean,
            required: true,
        },
        /**
         * List of all transcription layers on this document.
         */
        transcriptions: {
            type: Array,
            required: true,
        },
        /**
         * Scope of the export task, which will appear in the header to indicate
         * whether you are exporting the entire document or specific images.
         */
        scope: {
            type: String,
            required: true,
        },
        /**
         * Callback function for submitting the export task.
         */
        onSubmit: {
            type: Function,
            required: true,
        },
        /**
         * Callback function for clicking "cancel".
         */
        onCancel: {
            type: Function,
            required: true,
        },
    },
    computed: {
        ...mapState({
            documentId: (state) => state.document.id,
            fileFormat: (state) => state.forms.export.fileFormat,
            formRegionTypes: (state) => state.forms.export.regionTypes,
            includeAll: (state) => state.forms.export.includeAll,
            includeImages: (state) => state.forms.export.includeImages,
            includeCharacters: (state) => state.forms.export.includeCharacters,
            includeMetadata: (state) => state.forms.export.includeMetadata,
            includeModels: (state) => state.forms.export.includeModels,
            includeAnnotations: (state) => state.forms.export.includeAnnotations,
            includeComments: (state) => state.forms.export.includeComments,
            allTranscriptions: (state) => state.forms.export.allTranscriptions,
            transcriptionLayer: (state) => state.forms.export.transcription,
        }),
        /**
         * "full" when the user picked the Full-Backup radio, "custom" when they
         * revealed the checkbox pane. Mirrors the `includeAll` store field so
         * the two are always in sync.
         */
        mode() {
            return this.includeAll ? "full" : "custom";
        },
        /**
         * this form is invalid and cannot be submitted if it is missing layer or file format
         */
        invalid() {
            return !this.transcriptionLayer || !this.fileFormat;
        },
        /**
         * collect region types options for checkbox elements
         */
        regionTypesOptions() {
            return this.regionTypes.map((type) => ({
                label: type.name,
                value: type.pk.toString(),
                selected: this.formRegionTypes.includes(type.pk.toString()),
            }));
        },
        /**
         * Convert transcription layers to options for select element
         */
        transcriptionOptions() {
            return this.transcriptions.map((transcription) => ({
                label: transcription.name,
                value: transcription.pk.toString(),
                selected: this.transcriptionLayer.toString() === transcription.pk.toString(),
            }));
        },
        /**
         * File format options for export
         */
        fileFormatOptions() {
            const formatOptions = [
                {
                    label: "Text",
                    value: "text",
                    selected: this.fileFormat === "text",
                },
                {
                    label: "PageXML",
                    value: "pagexml",
                    selected: this.fileFormat === "pagexml",
                },
                {
                    label: "ALTO",
                    value: "alto",
                    selected: this.fileFormat === "alto",
                },
            ];
            if (this.markdownEnabled) {
                formatOptions.push({
                    label: "OpenITI Markdown",
                    value: "openitimarkdown",
                    selected: this.fileFormat === "openitimarkdown",
                });
            }
            if (this.teiEnabled) {
                formatOptions.push({
                    label: "OpenITI TEI XML",
                    value: "teixml",
                    selected: this.fileFormat === "teixml",
                });
            }
            return formatOptions;
        },
    },
    created() {
        // Default to Full-Backup mode when the modal opens. The user can
        // still uncheck to reveal the fine-grained options.
        this.handleGenericInput({
            form: "export", field: "includeAll", value: true,
        });
        // initialize transcription field with user's last edited transcription
        // eslint-disable-next-line no-undef
        let itrans = userProfile.get("initialTranscriptions");
        if (itrans && itrans[this.documentId]) {
            this.handleGenericInput({
                form: "export",
                field: "transcription",
                value: itrans[this.documentId],
            });
        }
        // initialize export format with user's last selected format
        // eslint-disable-next-line no-undef
        let exportFormat = userProfile.get("exportFormat");
        if (exportFormat) {
            this.handleGenericInput({
                form: "export",
                field: "fileFormat",
                value: exportFormat,
            });
        }
    },
    methods: {
        ...mapActions("forms", [
            "handleCheckboxArrayInput",
            "handleGenericInput",
        ]),
        handleFileFormatChange(e) {
            this.handleGenericInput({
                form: "export", field: "fileFormat", value: e.target.value,
            });
            if (e.target.value === "text") {
                // if switching to text export, uncheck "include images"
                this.handleGenericInput({ form: "export", field: "includeImages", value: false });
            }
            // store the export format choice for later use
            // eslint-disable-next-line no-undef
            userProfile.set("exportFormat", e.target.value);
        },
        handleIncludeImagesChange(e) {
            this.handleGenericInput({
                form: "export",
                field: "includeImages",
                value: e.target.checked,
            });
        },
        handleIncludeCharactersChange(e) {
            // "Character locations" replaces the old separate Characters + Graphs
            // checkboxes -- Daniel Stoekl flagged them as a doublet. One UI
            // control, both backend flags in lock-step.
            const checked = e.target.checked;
            this.handleGenericInput({
                form: "export", field: "includeCharacters", value: checked,
            });
            this.handleGenericInput({
                form: "export", field: "includeGraph", value: checked,
            });
        },
        handleGenericCheckbox(field, e) {
            this.handleGenericInput({
                form: "export", field, value: e.target.checked,
            });
        },
        handleModeChange(e) {
            // Full backup = includeAll True. Custom = includeAll False (fine-
            // grained checkboxes take over). tasks.js already OR-shortcuts
            // includeAll || includeXxx per field, so switching to Custom does
            // NOT flip the individual flags -- the user's last choices stay.
            this.handleGenericInput({
                form: "export",
                field: "includeAll",
                value: e.target.value === "full",
            });
        },
        handleRegionTypesChange(e) {
            this.handleCheckboxArrayInput({
                form: "export",
                field: "regionTypes",
                checked: e.target.checked,
                value: e.target.value,
            });
        },
        handleTranscriptionChange(e) {
            this.handleGenericInput({
                form: "export", field: "transcription", value: e.target.value,
            });
        },
    },
};
</script>
