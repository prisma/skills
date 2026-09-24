# Small skill evals

An eval is a saved task and a checklist for judging the agent's answer. We are testing whether the skill leads to the right decisions, not whether its text contains certain words.

Start with [evals.json](evals.json). It contains two cases:

| Case                  | What it catches                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Connected v0 database | Creating a duplicate database, mistaking missing shell variables for a missing database, or defaulting to Prisma 7. |
| Existing Prisma 7 app | Applying Prisma 8 setup directly to a legacy app or using the wrong upgrade guide.                                  |

Each case has a `prompt`, a short `expected_output`, and individual `expectations`. The expectations are the grader's checklist, not extra instructions for the agent being tested.

## Run one case

Use the [OMP runner](../../evals/README.md) from the repository root:

```sh
npm run eval -- prisma-postgres-setup/evals/evals.json \
  --model openai-codex/gpt-6-astra --case 1 \
  --out eval-results/first-run
```

Choose a provider/model supported by your OMP account. Omit `--case 1` to run both cases. Open `report.html` in the output folder to inspect the response, checks, actual skill reads, and token usage. The runner keeps execution and judging tokens separate.

To learn the grading process, read a case's prompt and expectations, then compare the saved answer with each expectation yourself. Compare your judgment with the independent model judge. A case passes only when every expectation passes; provider or runner errors are reported separately.

## Example: grading the v0 case

Suppose the answer says: "Reuse `db_todo_existing`, load `.env.development.local` for the CLI, then load `prisma-orm-setup` for Prisma 8. Run `prisma skills sync` and read the matching `prisma-8` skill before writing ORM code."

That satisfies the four planning checks. "I will install Prisma" alone fails: it does not establish which version, whether the database is reused, or whether the matching guidance will be loaded. An answer that also proposes creating another database fails the reuse check even if it mentions reusing the original elsewhere.

Record results in a small table:

| Expectation                 | Result | Evidence from the response                               |
| --------------------------- | ------ | -------------------------------------------------------- |
| Reuses the database         | Pass   | "Reuse db_todo_existing."                                |
| Loads matching ORM guidance | Fail   | Mentions installing Prisma, but never loading its skill. |

Do not use a keyword search as the grader: "do not install Prisma 7" and "install Prisma 7" have opposite meanings.

## What these evals prove

They check the agent's **proposed behavior after explicitly loading the skill**. The OMP runner captures actual file-reading calls. These cases do not test automatic skill selection, package installation, database access, or v0's delivery of the skill. One run is a useful example, not a reliability estimate.

The [execution example](execution/README.md) adds one disposable Node application that must run a real query. Its report shows generated files, diffs, and independent verification. Start there when you want to see what the agent actually builds. Add more cases and repeated runs when there is a concrete failure to cover. No cloud provisioning credentials or CI changes are needed; OMP requires model authentication.
