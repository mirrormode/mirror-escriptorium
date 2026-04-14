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
                label="File Format"
                :disabled="disabled"
                :options="fileFormatOptions"
                :on-change="handleFileFormatChange"
                required
            />

            <div class="escr-form-field escr-checkbox-field escr-include-all-field">
                <label>
                    <input
                        type="checkbox"
                        :checked="includeAll"
                        @change="handleIncludeAllChange"
                    >
                    Include all
                </label>
                <span class="escr-help-text">
                    Toggles all export options on. Disable to pick individually.
                </span>
            </div>

            <template v-if="!includeAll">
                <DropdownField
                    v-if="!allTranscriptions"
                    label="Transcription"
                    :disabled="disabled || !transcriptions"
                    :options="transcriptionOptions"
                    :on-change="handleTranscriptionChange"
                    required
                />

<<<<<<< HEAD
                <div class="escr-form-field escr-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            :checked="allTranscriptions"
                            @change="handleAllTranscriptionsChange"
                        >
                        Include all transcriptions
                    </label>
                    <span class="escr-help-text">
                        Includes all transcription layers, not just the selected one.
                    </span>
                </div>

                <div class="escr-form-field escr-include-images-field escr-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            value="include-images"
                            :checked="includeImages === true && fileFormat !== 'text'"
                            :disabled="fileFormat === 'text'"
                            @change="handleIncludeImagesChange"
                        >
                        Include images
                    </label>
                    <span class="escr-help-text">
                        Will significantly increase the time to produce and download the export.
                        Export will be zipped when images are included.
                    </span>
                </div>

                <div class="escr-form-field escr-include-characters-field escr-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            :checked="includeCharacters"
                            @change="handleIncludeCharactersChange"
                        >
                        Include characters
                    </label>
                    <span class="escr-help-text">
                        This data is only present for transcriptions coming from automatic recognition
                        and is invalidated by manual edition.
                    </span>
                </div>

                <div class="escr-form-field escr-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            :checked="includeMetadata"
                            @change="handleIncludeMetadataChange"
                        >
                        Include metadata
                    </label>
                    <span class="escr-help-text">
                        Includes document and part metadata.
                    </span>
                </div>

                <div class="escr-form-field escr-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            :checked="includeModels"
                            @change="handleIncludeModelsChange"
                        >
                        Include models
                    </label>
                    <span class="escr-help-text">
                        Includes the OCR models used to produce the transcriptions.
                    </span>
                </div>

                <div class="escr-form-field escr-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            :checked="includeAnnotations"
                            @change="handleIncludeAnnotationsChange"
                        >
                        Include annotations
                    </label>
                </div>

                <div class="escr-form-field escr-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            :checked="includeGraph"
                            @change="handleIncludeGraphChange"
                        >
                        Include graphs
                    </label>
                    <span class="escr-help-text">
                        Includes the reading order graph of the document.
                    </span>
                </div>

                <div class="escr-form-field escr-checkbox-field">
                    <label>
                        <input
                            type="checkbox"
                            :checked="includeComments"
                            @change="handleIncludeCommentsChange"
                        >
                        Include user comments
                    </label>
                </div>

                <div class="escr-region-types-header">
                    <span class="escr-region-types-label">Region Types</span>
                    <button
                        type="button"
                        class="escr-toggle-link"
                        @click="selectAllRegionTypes"
                    >Include all</button>
                    <span class="escr-toggle-separator">|</span>
                    <button
                        type="button"
                        class="escr-toggle-link"
                        @click="excludeAllRegionTypes"
                    >Exclude all</button>
                </div>
                <MultiSelectField
                    :on-change="handleRegionTypesChange"
                    :options="regionTypesOptions"
                    class="escr-region-types"
                    help-text="Select region types to include in the export."
                    placeholder="Select region types..."
                />
            </template>
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
            includeAll: (state) => state.forms.export.includeAll,
            includeImages: (state) => state.forms.export.includeImages,
            includeCharacters: (state) => state.forms.export.includeCharacters,
            includeMetadata: (state) => state.forms.export.includeMetadata,
            includeModels: (state) => state.forms.export.includeModels,
            includeAnnotations: (state) => state.forms.export.includeAnnotations,
            includeGraph: (state) => state.forms.export.includeGraph,
            includeComments: (state) => state.forms.export.includeComments,
            allTranscriptions: (state) => state.forms.export.allTranscriptions,
            formRegionTypes: (state) => state.forms.export.regionTypes,
            transcriptionLayer: (state) => state.forms.export.transcription,
        }),
        /**
         * this form is invalid and cannot be submitted if it is missing layer or file format
         */
        invalid() {
            if (!this.fileFormat) return true;
            if (!this.includeAll && !this.allTranscriptions && !this.transcriptionLayer) return true;
            return false;
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
                {
                    label: "JSON",
                    value: "json",
                    selected: this.fileFormat === "json",
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
        setField(field, value) {
            this.handleGenericInput({ form: "export", field, value });
        },
        handleFileFormatChange(e) {
            this.setField("fileFormat", e.target.value);
            if (e.target.value === "text") {
                this.setField("includeImages", false);
            }
            // eslint-disable-next-line no-undef
            userProfile.set("exportFormat", e.target.value);
        },
        handleIncludeAllChange(e) {
            this.setField("includeAll", e.target.checked);
        },
        handleAllTranscriptionsChange(e) {
            this.setField("allTranscriptions", e.target.checked);
        },
        handleIncludeImagesChange(e) {
            this.setField("includeImages", e.target.checked);
        },
        handleIncludeCharactersChange(e) {
            this.setField("includeCharacters", e.target.checked);
        },
        handleIncludeMetadataChange(e) {
            this.setField("includeMetadata", e.target.checked);
        },
        handleIncludeModelsChange(e) {
            this.setField("includeModels", e.target.checked);
        },
        handleIncludeAnnotationsChange(e) {
            this.setField("includeAnnotations", e.target.checked);
        },
        handleIncludeGraphChange(e) {
            this.setField("includeGraph", e.target.checked);
        },
        handleIncludeCommentsChange(e) {
            this.setField("includeComments", e.target.checked);
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
            this.setField("transcription", e.target.value);
        },
        selectAllRegionTypes() {
            const allValues = this.regionTypes.map((type) => type.pk.toString());
            this.setField("regionTypes", allValues);
        },
        excludeAllRegionTypes() {
            this.setField("regionTypes", []);
        },
    },
};
</script>
