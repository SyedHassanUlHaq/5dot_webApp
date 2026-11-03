import { z } from 'zod';

// Our CSP forbids eval. Zod's JIT fast-path probes `Function('')` (caught, harmless), but the blocked probe still shows up
// as a CSP issue in DevTools. Payloads here are tiny, so turn the JIT off instead.
// Import this module BEFORE any module that builds Zod schemas at load time.
z.config({ jitless: true });
