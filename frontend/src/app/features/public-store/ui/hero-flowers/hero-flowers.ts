import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hero-flowers',
  standalone: true,
  template: `
    <div
      class="hero-flowers pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <!-- Single SVG definition for the leaf shape -->
      <svg class="hero-flowers__defs" aria-hidden="true">
        <defs>
          <path
            id="leaf"
            d="m94.6 64.8c0-0.9 7.4-6.4 9.8-8.6 3.5-3.3 8.8-10.6 8.7-25.6l-1.5-29.7-25.4 13.6c-3.5 1.7-11.9 7.7-15.6 14.5-2.9 5.1-3.2 10.9-4.5 18.9-0.2 1.1-0.2 0.7-4.9-1.5-12.3-5.8-15-6.4-21.1-7l-8.6-0.9c0.7 1.9 1.7 3.7 2.6 6.1 1.3 4 3 9 3.5 13.8 0.3 2.5 1.8 7 2.5 8.4 3.9 7.5 8 11.1 15 11.8l9.2 0.8c0.8 0.1 1.1-0.3 1.3-0.6 2-3.4 1-4-0.2-6.6-1-1.6-2.8-1.7-4.3-1.8l-9-1.1c-1-0.2-2-0.9 0.5-1h8.1c2.9 0 2.4-0.4 1.4-1.7l-5.7-8c-1-1.2-2.5-1-4-1.2l-4.7-0.2c-2.3-0.2-1.8-0.8-0.6-1l6.1-0.8c-1.1-1.5-5.6-5-9.8-7.7-0.7-0.6-0.5-1.1 0.3-0.7 3.2 1.4 9.7 5.6 10.9 6.6h0.2l0.2-2.2c0.4-4.2 0.9-2.8 1.2-1l0.7 4.6c0.1 0.9 0.8 1.6 1.5 2.4l6.7 7.6 0.3 0.1 0.7-6.2c0.3-1.7 1-1.3 1 0l0.1 6.7c0 2.3 1.1 4.3 1.9 5.5 0.4 0.5 0.8 0.8 1.3 0l6.5-10.5c0.8-1.5 0.8-1.7 0.5-3.6l-2.2-10.8c-0.1-1.8 0.4-1.6 0.9 0l3 9.2c0 1 3.5-4.8 5.7-8.4 1.1-1.9 0.6-2.4 0.1-5.3l-1.5-7.3c-0.2-1.3 0.5-2 1-0.3l3 8.3c0.5 0.2 5.3-7.8 6.1-9.3 0.4-1-0.1-1.7-0.4-3.7l-2.2-10.5c-0.2-0.8 0.3-1.5 0.7 0l3.8 10.5 0.3 0.1 1.2-1.6c0.7-0.9 1.2-0.5 0.7 0.3l-1.1 1.9 0.1 0.1 10.3-1.8c2.8-0.7 2.8-0.5 2.2 0.2l-12.7 4c-1.8 0.6-2.3 1.4-3.5 3.5l-3.8 6.9c-0.5 0.7 0.3 0.6 1.3 0.4l7.5-1.5c2-0.3 2 0.5 1.5 0.7-0.8 0.4-8.5 2.8-10.8 3.8-1 0.3-1.6 1.2-2.2 2.3l-4.7 8.2c-0.3 0.8 0.4 0.5 1.7 0.3l8.2-1.8c2-0.4 2 0.5 1 0.7-2.2 0.9-9.9 3-11.7 3.9-1 0.4-1.5 1.6-1.8 2.1l-6 11c-0.2 0.8 0.1 1.2 1 1.2 4.3 0.3 5.6-0.2 9-2.1 5.5-3.1 6.3-3.6 5-1.8l-5.4 3.7-0.3 0.5 0.5 0.3 10.7 2.1c1.4 0.2 1.8-0.1 2.8-0.4l4.7-1.8c1.5-0.7 1.8 0 1 0.3l-4.2 2.8 4.8 2.2c2.9 1.4 7.4 3.6 6.7 4l-12.3-4.4-0.1 0.2 2.6 6c0.5 1.7-0.2 1.7-0.9 0.5l-4.1-6c-0.5-0.8-0.9-1-1.9-1.3-3.3-0.7-7.7-1.2-11.3-1.1-0.5 0-0.7 0.1-0.2 0.9l5.2 9.5c0.2 1-0.5 0.5-1.3-0.5l-6.5-8.5c-1-1.3-1.7-1.5-3-1.4-3.5 0.2-5 0.1-6.5 1.4-0.5 0.6-1.2 1.5-0.4 2.5 6.3 7.6 7.7 10 11.4 12.2 5.3 2.6 14.3 3.1 22.5-0.7 4.1-1.8 9-4 17.4-5-5.4-7.7-8.6-12-13.1-15.3-4.5-3.2-10.2-6.7-12.3-8v-0.3z"
          />
        </defs>
      </svg>

      <!-- Leaf 1: Large, far-left bottom -->
      <div class="hero-flowers__pos hero-flowers__pos--1">
        <div class="hero-flowers__anim hero-flowers__anim--a">
          <svg viewBox="30 -1 102 106"><use href="#leaf" class="hero-flowers__leaf-shape" /></svg>
        </div>
      </div>

      <!-- Leaf 2: Medium, left-center top -->
      <div class="hero-flowers__pos hero-flowers__pos--2">
        <div class="hero-flowers__anim hero-flowers__anim--b">
          <svg viewBox="30 -1 102 106"><use href="#leaf" class="hero-flowers__leaf-shape" /></svg>
        </div>
      </div>

      <!-- Leaf 3: Small, center bottom -->
      <div class="hero-flowers__pos hero-flowers__pos--3">
        <div class="hero-flowers__anim hero-flowers__anim--c">
          <svg viewBox="30 -1 102 106"><use href="#leaf" class="hero-flowers__leaf-shape" /></svg>
        </div>
      </div>

      <!-- Leaf 4: Medium, center-right top -->
      <div class="hero-flowers__pos hero-flowers__pos--4">
        <div class="hero-flowers__anim hero-flowers__anim--a">
          <svg viewBox="30 -1 102 106"><use href="#leaf" class="hero-flowers__leaf-shape" /></svg>
        </div>
      </div>

      <!-- Leaf 5: Small, right bottom -->
      <div class="hero-flowers__pos hero-flowers__pos--5">
        <div class="hero-flowers__anim hero-flowers__anim--b">
          <svg viewBox="30 -1 102 106"><use href="#leaf" class="hero-flowers__leaf-shape" /></svg>
        </div>
      </div>

      <!-- Leaf 6: Tiny, far-right bottom -->
      <div class="hero-flowers__pos hero-flowers__pos--6">
        <div class="hero-flowers__anim hero-flowers__anim--c">
          <svg viewBox="30 -1 102 106"><use href="#leaf" class="hero-flowers__leaf-shape" /></svg>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .hero-flowers__defs {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
    }

    .hero-flowers__leaf-shape {
      fill: currentColor;
    }

    .hero-flowers__pos {
      position: absolute;
    }

    .hero-flowers__pos--1 {
      width: 220px;
      height: 220px;
      bottom: -30px;
      left: 2%;
      color: rgba(255, 255, 255, 0.07);
      transform: rotate(-10deg);
    }

    .hero-flowers__pos--2 {
      width: 150px;
      height: 150px;
      top: 5%;
      left: 18%;
      color: rgba(255, 255, 255, 0.06);
      transform: scaleX(-1) rotate(25deg);
    }

    .hero-flowers__pos--3 {
      width: 100px;
      height: 130px;
      bottom: 10%;
      left: 38%;
      color: rgba(255, 255, 255, 0.05);
      transform: rotate(40deg) scaleX(0.7);
    }

    .hero-flowers__pos--4 {
      width: 130px;
      height: 130px;
      top: 8%;
      left: 55%;
      color: rgba(255, 255, 255, 0.05);
      transform: scaleX(-1) rotate(-5deg);
    }

    .hero-flowers__pos--5 {
      width: 80px;
      height: 120px;
      bottom: 5%;
      left: 72%;
      color: rgba(255, 255, 255, 0.05);
      transform: rotate(55deg) scaleX(0.6);
    }

    .hero-flowers__pos--6 {
      width: 110px;
      height: 70px;
      bottom: -10px;
      right: 3%;
      color: rgba(255, 255, 255, 0.04);
      transform: scaleX(-1) rotate(-30deg);
    }

    .hero-flowers__anim {
      width: 100%;
      height: 100%;
      will-change: transform;
    }

    .hero-flowers__anim--a {
      animation: sway-a 9s ease-in-out infinite;
    }
    .hero-flowers__anim--b {
      animation: sway-b 11s ease-in-out infinite;
    }
    .hero-flowers__anim--c {
      animation: sway-c 8s ease-in-out infinite;
    }

    .hero-flowers__pos--2 .hero-flowers__anim {
      animation-delay: 1s;
    }
    .hero-flowers__pos--3 .hero-flowers__anim {
      animation-delay: 0.5s;
    }
    .hero-flowers__pos--4 .hero-flowers__anim {
      animation-delay: 2s;
    }
    .hero-flowers__pos--5 .hero-flowers__anim {
      animation-delay: 1.5s;
    }
    .hero-flowers__pos--6 .hero-flowers__anim {
      animation-delay: 0.8s;
    }

    @keyframes sway-a {
      0%,
      100% {
        transform: translate(0, 0) rotate(0deg);
      }
      20% {
        transform: translate(12px, 10px) rotate(2deg);
      }
      50% {
        transform: translate(-8px, 20px) rotate(-1deg);
      }
      80% {
        transform: translate(10px, 12px) rotate(1.5deg);
      }
    }

    @keyframes sway-b {
      0%,
      100% {
        transform: translate(0, 0) rotate(0deg);
      }
      25% {
        transform: translate(-14px, 8px) rotate(-2deg);
      }
      55% {
        transform: translate(10px, 18px) rotate(1deg);
      }
      85% {
        transform: translate(-6px, 8px) rotate(-1deg);
      }
    }

    @keyframes sway-c {
      0%,
      100% {
        transform: translate(0, 0) rotate(0deg);
      }
      30% {
        transform: translate(10px, 12px) rotate(1.5deg);
      }
      65% {
        transform: translate(-10px, 16px) rotate(-1.5deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .hero-flowers__anim {
        animation: none !important;
      }
    }

    @media (max-width: 640px) {
      .hero-flowers__pos--4,
      .hero-flowers__pos--5,
      .hero-flowers__pos--6 {
        display: none;
      }
      .hero-flowers__pos--1 {
        width: 140px;
        height: 140px;
      }
      .hero-flowers__pos--2 {
        width: 100px;
        height: 100px;
        left: 10%;
      }
      .hero-flowers__pos--3 {
        width: 80px;
        height: 80px;
        left: 50%;
      }
    }
  `,
})
export class HeroFlowers {}
