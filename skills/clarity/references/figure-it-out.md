<!-- Flow Copilot text based on ideas from cursor/plugins pstack/skills/figure-it-out revision d0ef80d86795816da932a153458c5dbe192d294e. -->

# Figure it out

Use this workflow when the user says "figure it out yourself", or hands off a large task to finish without them. Design the plan first. Then run it as a series of experiments.

1. Write the done condition before you start. It must be a check that can fail: a command, a test, or a value in the real artifact.
2. Set the amount of checking from the risk. A change that cannot be undone, or that touches many parts, gets more checks. A small change that you can revert gets fewer.
3. Split the work into small units that each end in a state you can check. Do the most uncertain unit first. Build the check before the work, and record its value before the change.
4. For each unit, state a hypothesis, make the smallest change, and measure the result on the real artifact. Keep the change when it moves toward the done condition. Revert it when it does not.
5. Give each check one verdict: VERIFIED, NOT VERIFIED, or INCONCLUSIVE. INCONCLUSIVE is not a pass. Read the artifact, not the report of a worker. When a check passes too easily, examine the check before the system.
6. At the end, send the result and the done condition to the adversarial role in the Clarity model roles. That reviewer attacks the work against the done condition.
7. Reply with the plan, the risk level and its reason, the decisions you made, what is verified, and what is still open.

Units with defined steps go to the investigation role. The parent session keeps the plan and the verdicts.
