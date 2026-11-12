import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from './client';
import { users, formDefinitions } from './schema';
import 'dotenv/config';

async function seed() {
  // -----------------------------------------------------------
  // Crear Admin
  // -----------------------------------------------------------
  const adminEmail = process.env.ADMIN_EMAIL!;
  const adminPassword = process.env.ADMIN_PASSWORD!;

  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail));

  if (existingAdmin.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await db.insert(users).values({
      email: adminEmail,
      nombre: 'Administrador',
      passwordHash: hash,
      rol: 'admin',
    });
    console.log('Admin creado:', adminEmail);
  } else {
    console.log('Admin ya existe:', adminEmail);
  }

  // -----------------------------------------------------------
  // Crear Formularios Iniciales
  // -----------------------------------------------------------
  const formularios = [
    {
      slug: 'solicitud-ovas',
      titulo: 'Solicitud de OVAS',
      descripcion: 'Solicitud para la creacion de Objetos Virtuales de Aprendizaje',
      schemaJson: {
        fields: [
          // Información General
          { name: 'fecha_solicitud', type: 'date', label: 'Fecha de solicitud', required: true, group: 'Información General' },
          { name: 'ciclo', type: 'select', label: 'Ciclo', options: ['01', '02'], required: true, group: 'Información General' },
          { name: 'facultad', type: 'select', label: 'Facultad o dependencia', optionsSource: 'facultades', required: true, group: 'Información General' },
          { name: 'carrera', type: 'select', label: 'Carrera', optionsSource: 'carreras', dependsOn: 'facultad', required: true, group: 'Información General' },
          { name: 'asignatura', type: 'text', label: 'Nombre de la asignatura', required: true, group: 'Información General' },
          { name: 'docente', type: 'text', label: 'Nombre completo del docente', required: true, group: 'Información General' },
          { name: 'coordinador', type: 'text', label: 'Nombre completo del coordinador', required: true, group: 'Información General' },
          
          // Datos de la OVA
          { name: 'ova_nombre', type: 'text', label: 'Nombre de la OVA', required: true, group: 'Datos de la OVA' },
          { name: 'ova_tipo', type: 'select', label: 'Tipo de OVA', options: ['VIDEO TEÓRICO: Docente explicando un tema en especifico', 'VIDEO PRÁCTICO: Realización de un laboratorio o procedimiento práctico', 'HERRAMIENTA O RECURSO WEB: El docente explica a través de un video el uso, configuración y aplicación de un recurso o herramienta web'], required: true, group: 'Datos de la OVA' },
          { name: 'fecha_ejecucion', type: 'date', label: 'Fecha de ejecución o publicación', required: true, group: 'Datos de la OVA' },
          { name: 'actividad', type: 'textarea', label: 'Actividad a realizar (vincular evidencia)', required: true, group: 'Datos de la OVA' },
          { name: 'observaciones', type: 'textarea', label: 'Observaciones (equipo a utilizar)', required: false, group: 'Datos de la OVA' },
          
          // Datos del docente responsable
          { name: 'docente_resp_nombre', type: 'text', label: 'Nombre completo del docente responsable', required: true, group: 'Datos del Docente Responsable' },
          { name: 'dui', type: 'text', label: 'N° de DUI', required: true, group: 'Datos del Docente Responsable' },
          { name: 'nit', type: 'text', label: 'N° de NIT', required: true, group: 'Datos del Docente Responsable' },
          { name: 'correo_docente', type: 'text', label: 'Correo electrónico', required: true, group: 'Datos del Docente Responsable' },
          { name: 'telefono', type: 'text', label: 'Teléfono', required: true, group: 'Datos del Docente Responsable' },
          { name: 'credito_fiscal', type: 'text', label: 'Crédito Fiscal (N/A si no aplica)', required: true, group: 'Datos del Docente Responsable' },
        ],
        transiciones: {
          recibido: ['observado', 'aprobado'],
          observado: ['aprobado'],
          aprobado: ['finalizado'],
        },
      },
    },
    {
      slug: 'solicitud-contenidistas',
      titulo: 'Solicitud de Validación de Contenidistas',
      descripcion: 'Solicitud para la validación y contratación de contenidistas.',
      schemaJson: {
        fields: [
          // Datos Generales
          { name: 'fecha_solicitud', type: 'date', label: 'Fecha de solicitud', required: true, group: 'Datos Generales' },
          { name: 'ciclo', type: 'select', label: 'Ciclo', options: ['01', '02'], required: true, group: 'Datos Generales' },
          { name: 'facultad', type: 'select', label: 'Facultad o dependencia', optionsSource: 'facultades', required: true, group: 'Datos Generales' },
          { name: 'carrera', type: 'select', label: 'Carrera', optionsSource: 'carreras', dependsOn: 'facultad', required: true, group: 'Datos Generales' },
          { name: 'asignatura', type: 'text', label: 'Nombre de la asignatura', required: true, group: 'Datos Generales' },
          { name: 'profesional_nombre', type: 'text', label: 'Nombre completo del profesional a contratar', required: true, group: 'Datos Generales' },
          { name: 'coordinador', type: 'text', label: 'Nombre del coordinador(a)', required: true, group: 'Datos Generales' },
          { name: 'coordinador_correo', type: 'text', label: 'Correo electrónico del coordinador(a)', required: true, group: 'Datos Generales' },

          // Validación de Facultad
          { name: 'primer_titulacion', type: 'text', label: 'Escriba su primer titulación obtenida', required: true, group: 'Validación de Facultad' },
          { name: 'segunda_titulacion', type: 'text', label: 'Escriba su segunda titulación obtenida', required: true, group: 'Validación de Facultad' },
          { name: 'especializacion', type: 'text', label: 'Especialización o Acreditación relacionada con la asignatura a virtualizar', required: true, group: 'Validación de Facultad' },
          { name: 'experiencia_facultad', type: 'textarea', label: 'Enliste su experiencia desarrollando asignaturas de la misma naturaleza (Ej: Biología-2020)', required: true, group: 'Validación de Facultad' },

          // Validación de Dirección de Tecnología Educativa
          { name: 'diplomados', type: 'textarea', label: 'Diplomados, certificaciones, cursos de tutor virtual o similares (AVA)', required: true, group: 'Validación de Dirección de Tecnología Educativa' },
          { name: 'experiencia_tutoria', type: 'textarea', label: 'Experiencia en tutoría virtual (Nombre de asignatura, año, institución)', required: true, group: 'Validación de Dirección de Tecnología Educativa' },

          // Datos del docente responsable
          { name: 'dui', type: 'text', label: 'N° de DUI', required: true, group: 'Datos del Docente Responsable' },
          { name: 'nit', type: 'text', label: 'N° de NIT (Si es homologado con DUI, colocar el DUI)', required: true, group: 'Datos del Docente Responsable' },
          { name: 'correo_docente', type: 'text', label: 'Correo electrónico del docente a contratar', required: true, group: 'Datos del Docente Responsable' },
          { name: 'telefono', type: 'text', label: 'N° de teléfono', required: true, group: 'Datos del Docente Responsable' },
          { name: 'credito_fiscal', type: 'text', label: 'Crédito Fiscal (si aplica)', required: true, group: 'Datos del Docente Responsable' },
          { name: 'virtualizacion', type: 'select', label: 'Virtualización de Asignatura', options: ['25%', '50%', '75%', '100%'], required: true, group: 'Datos del Docente Responsable' },
          { name: 'cv_archivo', type: 'file', label: 'Adjuntar CV (Aplica para profesionales por primera vez)', required: true, group: 'Datos del Docente Responsable' },
          
          // CAMPO DE INFORMACIÓN (IMAGEN DE ARANCELES)
          { name: 'info_aranceles', type: 'info', label: 'Temas Arancelarios (Informativo)', required: false, group: 'Datos del Docente Responsable' }
        ],
        transiciones: {
          recibido: ['observado', 'aprobado'],
          observado: ['aprobado'],
          aprobado: ['finalizado'],
        },
      },
    },
    {
      slug: 'solicitud-realidad-virtual',
      titulo: 'Solicitud de proyectos RV/RA',
      descripcion: 'Solicitud para el desarrollo de contenidos en Realidad Virtual o Realidad Aumentada.',
      schemaJson: {
        fields: [
          // Datos Generales del Solicitante
          { name: 'facultad', type: 'select', label: 'Facultad', optionsSource: 'facultades', required: true, group: 'Datos Generales del Solicitante' },
          { name: 'carrera', type: 'select', label: 'Carrera', optionsSource: 'carreras', dependsOn: 'facultad', required: true, group: 'Datos Generales del Solicitante' },
          { name: 'asignatura', type: 'text', label: 'Asignatura y sección', required: true, group: 'Datos Generales del Solicitante' },
          { name: 'solicitante_nombre', type: 'text', label: 'Nombre completo del solicitante', required: true, group: 'Datos Generales del Solicitante' },
          { name: 'solicitante_correo', type: 'text', label: 'Correo electrónico del solicitante', required: true, group: 'Datos Generales del Solicitante' },
          { name: 'jefe_nombre', type: 'text', label: 'Nombre completo del jefe que autoriza', required: true, group: 'Datos Generales del Solicitante' },
          { name: 'jefe_correo', type: 'text', label: 'Correo electrónico del jefe que autoriza', required: true, group: 'Datos Generales del Solicitante' },

          // Datos Generales del Proyecto
          { name: 'titulo_proyecto', type: 'text', label: 'Título del proyecto', required: true, group: 'Datos Generales del Proyecto' },
          { name: 'tipo_contenido', type: 'select', label: 'Tipo de contenido solicitado', options: ['Realidad Virtual', 'Realidad Aumentada', 'Metaverso', 'Holografía'], required: true, group: 'Datos Generales del Proyecto' },
          { name: 'fecha_ejecucion', type: 'date', label: 'Fecha de ejecución', required: true, group: 'Datos Generales del Proyecto' },
          { name: 'utiliza_gafas', type: 'radio', label: '¿Utilizará Gafas?', options: ['Si', 'No'], required: true, group: 'Datos Generales del Proyecto' },
          { name: 'cantidad_gafas', type: 'text', label: 'Cantidad de Gafas (N/A si no utiliza)', required: true, group: 'Datos Generales del Proyecto' },
          { name: 'insumos_archivo', type: 'file', label: 'Anexar documento Word/PDF con enlaces a insumos', required: true, group: 'Datos Generales del Proyecto' },
        ],
        transiciones: {
          recibido: ['observado', 'aprobado'],
          observado: ['aprobado'],
          aprobado: ['finalizado'],
        },
      },
    },
    {
      slug: 'evaluacion-monitor-virtual',
      titulo: 'Evaluación de Monitores Virtuales',
      descripcion: 'Evaluación dirigida a los coordinadores de carrera para medir el desempeño del Monitor Virtual.',
      schemaJson: {
        bypassApproval: true, // Pasa directo a finalizado
        fields: [
          // Datos del Evaluador
          { name: 'coordinador_nombre', type: 'text', label: 'Nombre completo del coordinador', required: true, group: 'Datos del Evaluador' },
          { name: 'coordinador_correo', type: 'text', label: 'Correo electrónico', required: true, group: 'Datos del Evaluador' },
          
          // Datos de la Evaluación
          { name: 'ciclo', type: 'select', label: 'Ciclo a evaluar', options: ['01', '02'], required: true, group: 'Datos de la Evaluación' },
          { name: 'facultad', type: 'select', label: 'Facultad en la que brindó servicio', optionsSource: 'facultades', required: true, group: 'Datos de la Evaluación' },
          { name: 'monitor_evaluado', type: 'select', label: 'Seleccione el Monitor a evaluar', optionsSource: 'monitores', dependsOn: 'facultad', required: true, group: 'Datos de la Evaluación' },

          // Criterios (Escala Likert)
          { name: 'crit_1', type: 'radio', label: '1. Los informes y recomendaciones entregados por el monitor son claros, pertinentes y útiles.', options: ['Malo', 'Bueno', 'Regular', 'Muy bueno', 'Excelente'], required: true, group: 'Criterios de Evaluación' },
          { name: 'crit_2', type: 'radio', label: '2. El monitor realizó un seguimiento diario constante y efectivo al tutor y estudiantes.', options: ['Malo', 'Bueno', 'Regular', 'Muy bueno', 'Excelente'], required: true, group: 'Criterios de Evaluación' },
          { name: 'crit_3', type: 'radio', label: '3. Acompañamiento en informes a coordinaciones para prevención de deserciones.', options: ['Malo', 'Bueno', 'Regular', 'Muy bueno', 'Excelente'], required: true, group: 'Criterios de Evaluación' },
          { name: 'crit_4', type: 'radio', label: '4. Nivel de comunicación asertiva y oportuna con el tutor y estudiantes.', options: ['Malo', 'Bueno', 'Regular', 'Muy bueno', 'Excelente'], required: true, group: 'Criterios de Evaluación' },
          { name: 'crit_5', type: 'radio', label: '5. Capacidad de resolver incidencias técnicas o canalizarlas adecuadamente.', options: ['Malo', 'Bueno', 'Regular', 'Muy bueno', 'Excelente'], required: true, group: 'Criterios de Evaluación' },
          { name: 'crit_6', type: 'radio', label: '6. Promueve el uso y adopción de tecnologías para fortalecer el Aula virtual.', options: ['Malo', 'Bueno', 'Regular', 'Muy bueno', 'Excelente'], required: true, group: 'Criterios de Evaluación' },
          { name: 'crit_7', type: 'radio', label: '7. Cumple puntualmente con reportes, asistencia a reuniones y tareas asignadas.', options: ['Malo', 'Bueno', 'Regular', 'Muy bueno', 'Excelente'], required: true, group: 'Criterios de Evaluación' },
          { name: 'crit_8', type: 'radio', label: '8. Mantiene una actitud colaborativa, ética y profesional en su interacción.', options: ['Malo', 'Bueno', 'Regular', 'Muy bueno', 'Excelente'], required: true, group: 'Criterios de Evaluación' },

          // Observaciones
          { name: 'aspectos_mejorar', type: 'textarea', label: '¿Qué aspectos se deben mejorar en el desempeño del Monitor Virtual para el próximo ciclo?', required: true, group: 'Observaciones Finales' }
        ],
        transiciones: {
          recibido: ['observado', 'aprobado'],
          observado: ['aprobado'],
          aprobado: ['finalizado'],
        },
      },
    },
  ];

  // Sincronizar formularios (inserta o actualiza si el slug ya existe)
  for (const f of formularios) {
    await db
      .insert(formDefinitions)
      .values({
        slug: f.slug,
        titulo: f.titulo,
        descripcion: f.descripcion,
        schemaJson: f.schemaJson,
      })
      .onConflictDoUpdate({
        target: formDefinitions.slug,
        set: {
          titulo: f.titulo,
          descripcion: f.descripcion,
          schemaJson: f.schemaJson,
        },
      });
    console.log('Formulario sincronizado:', f.slug);
  }

  console.log('Seed completado');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });