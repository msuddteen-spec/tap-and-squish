export interface Particle {
  x: number;
  y: number;
  px: number;
  py: number;
  ax: number;
  ay: number;
  invMass: number;
}

export function createParticle(x: number, y: number, invMass = 1): Particle {
  return {
    x,
    y,
    px: x,
    py: y,
    ax: 0,
    ay: 0,
    invMass
  };
}

export function applyForce(particle: Particle, fx: number, fy: number): void {
  if (particle.invMass === 0) {
    return;
  }
  particle.ax += fx * particle.invMass;
  particle.ay += fy * particle.invMass;
}

export function integrate(particle: Particle, dt: number, damping: number): void {
  if (particle.invMass === 0) {
    particle.px = particle.x;
    particle.py = particle.y;
    particle.ax = 0;
    particle.ay = 0;
    return;
  }

  const vx = (particle.x - particle.px) * damping;
  const vy = (particle.y - particle.py) * damping;
  const dtSq = dt * dt;
  const nextX = particle.x + vx + particle.ax * dtSq;
  const nextY = particle.y + vy + particle.ay * dtSq;

  particle.px = particle.x;
  particle.py = particle.y;
  particle.x = nextX;
  particle.y = nextY;
  particle.ax = 0;
  particle.ay = 0;
}

export function setPosition(particle: Particle, x: number, y: number): void {
  particle.x = x;
  particle.y = y;
}

export function moveBy(particle: Particle, dx: number, dy: number): void {
  particle.x += dx;
  particle.y += dy;
}
