"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeAllRepositories = exports.getSubmissionRepository = exports.getFormFieldRepository = exports.getFormRepository = exports.getUserRepository = exports.SubmissionRepository = exports.FormFieldRepository = exports.FormRepository = exports.UserRepository = exports.BaseRepository = void 0;
var BaseRepository_1 = require("./base/BaseRepository");
Object.defineProperty(exports, "BaseRepository", { enumerable: true, get: function () { return BaseRepository_1.BaseRepository; } });
var UserRepository_1 = require("./UserRepository");
Object.defineProperty(exports, "UserRepository", { enumerable: true, get: function () { return UserRepository_1.UserRepository; } });
var FormRepository_1 = require("./FormRepository");
Object.defineProperty(exports, "FormRepository", { enumerable: true, get: function () { return FormRepository_1.FormRepository; } });
var FormFieldRepository_1 = require("./FormFieldRepository");
Object.defineProperty(exports, "FormFieldRepository", { enumerable: true, get: function () { return FormFieldRepository_1.FormFieldRepository; } });
var SubmissionRepository_1 = require("./SubmissionRepository");
Object.defineProperty(exports, "SubmissionRepository", { enumerable: true, get: function () { return SubmissionRepository_1.SubmissionRepository; } });
// Создание синглтонов репозиториев
const UserRepository_2 = require("./UserRepository");
const FormRepository_2 = require("./FormRepository");
const FormFieldRepository_2 = require("./FormFieldRepository");
const SubmissionRepository_2 = require("./SubmissionRepository");
let userRepository = null;
let formRepository = null;
let formFieldRepository = null;
let submissionRepository = null;
const getUserRepository = () => {
    if (!userRepository) {
        userRepository = new UserRepository_2.UserRepository();
    }
    return userRepository;
};
exports.getUserRepository = getUserRepository;
const getFormRepository = () => {
    if (!formRepository) {
        formRepository = new FormRepository_2.FormRepository();
    }
    return formRepository;
};
exports.getFormRepository = getFormRepository;
const getFormFieldRepository = () => {
    if (!formFieldRepository) {
        formFieldRepository = new FormFieldRepository_2.FormFieldRepository();
    }
    return formFieldRepository;
};
exports.getFormFieldRepository = getFormFieldRepository;
const getSubmissionRepository = () => {
    if (!submissionRepository) {
        submissionRepository = new SubmissionRepository_2.SubmissionRepository();
    }
    return submissionRepository;
};
exports.getSubmissionRepository = getSubmissionRepository;
// Функция для закрытия всех соединений
const closeAllRepositories = async () => {
    const promises = [];
    if (userRepository) {
        promises.push(userRepository.disconnect());
        userRepository = null;
    }
    if (formRepository) {
        promises.push(formRepository.disconnect());
        formRepository = null;
    }
    if (formFieldRepository) {
        promises.push(formFieldRepository.disconnect());
        formFieldRepository = null;
    }
    if (submissionRepository) {
        promises.push(submissionRepository.disconnect());
        submissionRepository = null;
    }
    await Promise.all(promises);
};
exports.closeAllRepositories = closeAllRepositories;
