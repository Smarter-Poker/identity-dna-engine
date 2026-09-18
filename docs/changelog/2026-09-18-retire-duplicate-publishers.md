# Retire duplicate release triggers

The old direct Vercel publisher is removed. Existing provider project connections and application code are unchanged. GitHub CI now checks that a second Vercel publisher or a retired release agent cannot be reintroduced accidentally. The regression includes the exact old production command. No cron or repair agent was added.
