"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const core = __importStar(require("@actions/core"));
class Logger {
    static LogOutputUrl(url) {
        if (url) {
            core.setOutput('pipeline-url', url);
            core.info(`More details on triggered pipeline can be found here : "${url}"`);
        }
    }
    static LogInfo(message) {
        core.info(message);
    }
    static LogPipelineTriggered(pipelineName, projectName) {
        core.info(`\Pipeline '${pipelineName}' is triggered in project '${projectName}'`);
    }
    static LogPipelineObject(object) {
        core.debug("Pipeline object : " + this.getPrintObject(object));
    }
    static LogPipelineTriggerInput(input) {
        core.debug("Input: " + this.getPrintObject(input));
    }
    static LogPipelineTriggerOutput(output) {
        core.debug("Output: " + this.getPrintObject(output));
    }
    static getPrintObject(object) {
        return JSON.stringify(object, null, 4);
    }
}
exports.Logger = Logger;
