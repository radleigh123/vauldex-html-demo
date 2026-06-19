const techColors = {
  React: "#61DAFB",
  "Spring Boot": "#6DB33F",
  PostgreSQL: "#336791",
  Redis: "#DC382D",
  Docker: "#2496ED",
  Vue: "#42B883",
  "Node.js": "#68A063",
  MongoDB: "#47A248",
  GraphQL: "#E10098",
  AWS: "#FF9900",
  "Next.js": "#000000",
  Kotlin: "#A97BFF",
  Kafka: "#231F20",
  Kubernetes: "#326CE5",
  Angular: "#DD0031",
  Go: "#00ADD8",
  Prometheus: "#E6522C",
  Grafana: "#F46800",
};

const container = document.querySelector(".timeline-container");

container.addEventListener("wheel", (evt) => {
  // Check if we are in desktop view (horizontal mode)
  // The breakpoint 900px matches your CSS media query
  if (window.innerWidth > 900) {
    // Prevent the default vertical scroll
    evt.preventDefault();

    // Scroll horizontally by the amount the user scrolled vertically
    // 'evt.deltaY' is the vertical scroll amount
    // container.scrollLeft += evt.deltaY;
    container.scrollLeft += evt.deltaX; // Optional: also allow horizontal scroll with shift key
  }
});

function createProjectCard(project) {
  const technologies = project.stack
    .map(
      (tech) =>
        `<span 
        class="stack-item"
        style="background-color: ${techColors[tech] || "#555"}">
        ${tech}
      </span>`,
    )
    .join("");

  return `
      <article class="project-card">

            <img 
                src="${project.image}"
                alt="${project.project} screenshot">

            <div class="project-content">

                <div class="stack">
                    ${technologies}
                </div>

                <h3>
                    ${project.project}
                </h3>

                <p>
                    ${project.description}
                </p>

                <p>
                    Status:
                    ${project.status}
                </p>

                <div class="project-links">

                    <a href="${project.website}"
                       target="_blank"
                       rel="noopener noreferrer">
                        Website
                    </a>

                    <a href="${project.github}"
                       target="_blank"
                       rel="noopener noreferrer">
                        GitHub
                    </a>

                </div>

                <button class="details-btn">
                    More Details ->
                </button>

                <div class="project-drawer">

                    <button class="close-btn">
                        ✕
                    </button>

                    <h4>Project Details</h4>

                    <p>
                        ${project.details}
                    </p>

                </div>

            </div>

        </article>
    `;
}

const data = [
  {
    project: "Galactic Cat Empire Management System",
    stack: ["React", "Spring Boot", "PostgreSQL", "Redis", "Docker"],
    description: "The software behind a galaxy-wide feline civilization.",
    details:
      "Designed a distributed microservice architecture with event-driven communication between feline colonies. Implemented JWT authentication for cat commanders, role-based access control, and a high-performance meow translation API capable of processing 10 million meows per second.",
    website: "https://google.com",
    github: "https://github.com",
    image:
      "https://i.pinimg.com/736x/1c/70/30/1c70309d95a973a99aba308a545923b3.jpg",
    status: "Currently conquering the Andromeda Galaxy",
  },

  {
    project: "Ultimate Procrastination Analytics Dashboard",
    stack: ["Vue", "Node.js", "MongoDB", "GraphQL", "AWS"],
    description:
      "AI that understands why your 5-minute break became a 6-hour adventure.",
    details:
      "Utilized machine learning models to predict future procrastination patterns, generated guilt-driven notifications, and stored millions of excuses in a globally replicated NoSQL database with 99.999% excuse availability.",
    website: "https://google.com",
    github: "https://github.com",
    image: "https://m.media-amazon.com/images/I/71Dk7BcylvL.jpg",
    status: "Delayed due to procrastination",
  },

  {
    project: "Time Travel Bug Tracker Enterprise Edition",
    stack: ["Next.js", "Kotlin", "PostgreSQL", "Kafka", "Kubernetes"],
    description: "Fix tomorrow's bugs before your past self writes them.",
    details:
      "Built a quantum-safe temporal database capable of tracking multiple timelines. Features include paradox detection, automated apology emails to past developers, and a rollback mechanism that may or may not have caused the dinosaurs to go extinct.",
    website: "https://google.com",
    github: "https://github.com",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZ2tqWPppaasK37GYvsNOrRuVkFlmkm5ervQ&s",
    status: "Timeline unstable, but operational",
  },

  {
    project: "The Almighty Coffee Dependency Monitor",
    stack: ["Angular", "Go", "Redis", "Prometheus", "Grafana"],
    description: "Keeping developers caffeinated and production servers alive.",
    details:
      "Engineered a real-time telemetry pipeline handling billions of coffee consumption events. Includes predictive burnout detection, espresso-based alerting systems, and a highly classified algorithm that determines whether a developer is alive or simply compiling Java.",
    website: "https://google.com",
    github: "https://github.com",
    image:
      "https://i.pinimg.com/564x/cb/43/c4/cb43c47a200a5881503868d0db67d2df.jpg",
    status: "Production ready (coffee required)",
  },
];

const projectContainer = document.querySelector("#projects-container");
projectContainer.innerHTML = data.map(createProjectCard).join("");

document.querySelectorAll(".details-btn").forEach((button) => {
  button.addEventListener("click", () => {
    button.closest(".project-card").classList.toggle("open");
  });
});

projectContainer.addEventListener("click", (event) => {
  const card = event.target.closest(".project-card");

  if (!card) return;

  // Open drawer
  if (event.target.closest(".details-btn")) {
    card.classList.add("open");
  }

  // Close drawer
  if (event.target.closest(".close-btn")) {
    card.classList.remove("open");
  }
});
