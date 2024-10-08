const express = require('express');
const handlers = require('@calendario/handlers');

const calendarioRouter = express.Router();

calendarioRouter.post('/guardarSemestre/:semestre', handlers.guardarSemestre);
calendarioRouter.post('/guardarColor/:color', handlers.guardarColor);
calendarioRouter.get('/personalizacion', handlers.personalizacionHorario);
calendarioRouter.get('/generarHorario',  handlers.generarHorarios);

module.exports = calendarioRouter;
