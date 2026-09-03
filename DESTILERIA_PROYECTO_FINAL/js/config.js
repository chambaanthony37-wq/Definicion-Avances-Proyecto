import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://mkihtmoauffvjmenxvli.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raWh0bW9hdWZmdmptZW54dmxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzU0ODgsImV4cCI6MjEwMzQxMTQ4OH0.Eo7gPtpBF4m16I26-BVnnSY6o9O50MG25mN5ONB3-vY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);