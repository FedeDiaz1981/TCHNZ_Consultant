export const brand = "TECHNIZED";

export const navLinks = [
  { label: "Home", href: "#header" },
  { label: "Nosotros", href: "#about" },
  { label: "Servicios", href: "#services" },
  { label: "Planes", href: "#plans" },
  { label: "Contacto", href: "#contact" }
];

export const socialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/blatorh", icon: "fab fa-facebook-f" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/blatorh", icon: "fab fa-linkedin-in" },
  { label: "Instagram", href: "https://www.instagram.com/blatorh", icon: "fab fa-instagram" }
];

export const hero = {
  headline: "TECHNIZED",
  highlight: "Business Consulting",
  tagline: "Crecimiento a tu alcance",
  description:
    "Desarrollamos e implementamos soluciones a la medida para consultores y organizaciones.",
  cta: { label: "Ver Servicios", href: "#services" }
};

export const informationCards = [
  {
    title: "Profesionalismo",
    text:
      "Contamos con los mejores profesionales de amplia experiencia tanto en el ambito de la consultoria como tambien en empresas multinacionales y nacionales.",
    icon: "fas fa-business-time",
    className: "bg-primary text-white"
  },
  {
    title: "Compromiso",
    text:
      "Nuestro compromiso es resolver desafios reales y brindar un servicio que exceda expectativas, con una experiencia clara y cercana para cada consultor y organizacion.",
    icon: "fas fa-handshake",
    className: "bg-primaryLight text-white"
  },
  {
    title: "Trabajo en Equipo",
    text:
      "Nuestros equipos trabajan junto a consultores y organizaciones para alcanzar metas y objetivos concretos.",
    icon: "fas fa-superscript",
    className: "bg-white text-slate-900"
  }
];

export const about = {
  label: "Nosotros",
  title: "Un equipo de trabajo especializado.",
  text:
    "Grupo Technized es un equipo de profesionales con solida experiencia y trayectoria en el mercado local y regional, adquirida en el ambito de la consultoria y en companias de primer nivel nacional e internacional. Presenta un variado y completo abanico de soluciones de negocios, producto de sus alianzas para brindar soluciones integrales de Business Consulting.",
  image: "/assets/images/about.png",
  imageAlt: "about"
};

export const services = {
  label: "NUESTROS SERVICIOS",
  title: "Explora ilimitadas posibilidades",
  text:
    "Potenciamos empresas con un enfoque agil y efectivo. Capacitamos y ayudamos a crear profesionales capaces de resolver problemas y mejorar la calidad de los negocios.",
  items: [
    {
      title: "Servicios y Estrategia",
      icon: "fas fa-briefcase",
      text:
        "Trabajamos para convertir ideas en accion; crear estrategias de innovacion novedosas; optimizar las capacidades de las organizaciones; y ayudar a impulsar el crecimiento de consultores y organizaciones.",
      extraLine: "Leer mas"
    },
    {
      title: "Consultoria de RRHH",
      icon: "fas fa-people-arrows",
      text:
        "Disponemos de un amplio y variado abanico de servicios de Recursos Humanos a traves de consultores expertos de RRHH para ayudar a consultores y organizaciones a alcanzar y superar sus objetivos sin inconvenientes."
    },
    {
      title: "Servicios de Tecnologia",
      icon: "fas fa-server",
      text:
        "Ayudamos a consultores y organizaciones a obtener una mirada integral de su negocio, con la tecnologia como una parte clave y como un impulsor de mejores resultados."
    },
    {
      title: "Consultoria de Payroll",
      icon: "fas fa-comment-dollar",
      text:
        "Ayudamos a consultores y organizaciones a resolver los desafios de la administracion de personal y liquidacion de sueldos. Contamos con especialistas actualizados en las normativas vigentes."
    },
    {
      title: "Servicios SAP",
      icon: "fas fa-globe",
      text:
        "Proyectos de implementacion, proyectos de migracion, reingenieria de procesos, SAP Finance Modules, SAP Logistics Modules, SAP ARIBA, SAP Real Estate, SAP BASIS & ABAP, SAP S/4 HANA, SAP HANA y SAP EHSM, entre otros."
    },
    {
      title: "Business Solutions",
      icon: "fas fa-tv",
      text:
        "World Class HCM Software para Latam y Europa, plataforma educativa, legajo digital, firma digital y electronica de recibos de sueldo y documentos Access, control products, software y CRM Suite, entre otros."
    }
  ]
};

export const contact = {
  label: "CONTACT",
  title: "Envianos tu consulta",
  form: {
    action: "https://formsubmit.co/info@blatorh.com",
    fields: {
      name: { label: "name", placeholder: "Enter name" },
      phone: { label: "phone", placeholder: "Enter phone number" },
      mail: { label: "mail", placeholder: "Enter email" },
      message: { label: "message", placeholder: "Message" }
    }
  },
  recaptchaKey: "6LeuSX8hAAAAAIZaVK4SVuVylDEYvo7EOcji0Ok6",
  image: "/assets/images/contact.png",
  imageAlt: "contact"
};

export const locationItems = [
  {
    title: "Direccion",
    text: "Cucha Cucha 1180 - CABA . Buenos Aires . ARG",
    icon: "far fa-map"
  },
  {
    title: "Consultas",
    text: "(+54) 011 2071 5534",
    icon: "fas fa-mobile-alt"
  },
  {
    title: "Mensajes",
    text: "info@blatorh.com",
    icon: "far fa-envelope"
  },
  {
    title: "Horarios",
    text: "09:00 AM - 18:00 PM",
    icon: "far fa-clock"
  }
];

export const footer = {
  title: "Technized",
  text:
    "Nos especializamos en buscar, desarrollar e implementar soluciones a la medida para consultores y organizaciones. Contamos con un staff de trabajo comprometido y con un alto grado de profesionalismo. Mas de 100 profesionales especializados",
  quickLinks: [
    { label: "Nosotros", href: "#about" },
    { label: "Servicios", href: "#services" },
    { label: "Planes", href: "#plans" },
    { label: "Contacto", href: "#contact" }
  ],
  certificates: [
    { src: "/assets/images/logosap.png", alt: "", width: 200 },
    { src: "/assets/images/successfactorlogo.webp", alt: "", width: 200 }
  ]
};

export const bottomBar = {
  credit: "Desarrolado por",
  brand: "Creativity",
  link: "https://creativityestudio.com.ar/",
  linkLabel: "www.creativityestudio.com.ar"
};
