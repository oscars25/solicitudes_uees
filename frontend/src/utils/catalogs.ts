export const facultades = [
  'Facultad de Medicina',
  'Facultad de Odontología',
  'Facultad de Ciencias Empresariales y Económicas',
  'Facultad de Ciencias Jurídicas',
  'Facultad de Ciencias Sociales',
  'Facultad de Ingeniería',
];

export const carrerasPorFacultad: Record<string, string[]> = {
  'Facultad de Medicina': [
    'Doctorado en Medicina',
    'Licenciatura en Enfermería',
    'Licenciatura en Nutrición y Dietética',
    'Técnico en Enfermería'
  ],
  'Facultad de Odontología': [
    'Doctorado en Cirugía Dental',
    'Técnico en Asistencia Odontológica'
  ],
  'Facultad de Ciencias Empresariales y Económicas': [
    'Licenciatura en Administración de Empresas',
    'Licenciatura en Marketing',
    'Técnico en Marketing Digital',
    'Licenciatura en Relaciones Públicas con especialidad en Marketing'
  ],
  'Facultad de Ciencias Jurídicas': [
    'Licenciatura en Ciencias Jurídicas',
    'Licenciatura en Relaciones y Negocios Internacionales'
  ],
  'Facultad de Ciencias Sociales': [
    'Licenciatura en Psicología',
    'Licenciatura en Lenguas Modernas en Inglés y Francés',
    'Licenciatura en Teología',
    'Licenciatura en Traducción e Interpretación del Idioma Inglés',
    'Profesorado y Licenciatura en Educación Inicial y Parvularia'
  ],
  'Facultad de Ingeniería': [
    'Ingeniería en Desarrollo de Software y Ciencia de Datos',
    'Ingeniería en Tecnologías Emergentes y Robótica',
    'Técnico en Ciberseguridad'
  ],
};

// Monitores por facultad
export const monitoresPorFacultad: Record<string, string[]> = {
  'Facultad de Ingeniería': ['Lic. Krissia Edith Jacobo Orellana'],
  'Facultad de Ciencias Jurídicas': ['Lic. Evila Yhosabeth Portillo de Escalante'],
  'Facultad de Ciencias Empresariales y Económicas': ['Lic. Eliezer Adonai Mendoza Loarca'],
  'Facultad de Ciencias Sociales': ['Lic. Nancy Carolina Navarro de Rafailán'],
  'Facultad de Odontología': ['Ing. Oscar Armando Santos Bonilla'],
  'Facultad de Medicina': [], // Pendiente de asignar
};