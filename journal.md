## Journal Entry

After being inspired by job boards like Jobright, I asked Cursor to combine a new implementation idea with my current working system.

That approach was naive. The request had too many requirements at once, which likely caused planning hallucinations and unstable outputs. The deployed version actually performed better than the newly suggested changes, and features that existed in production were no longer present after the attempted overhaul.

The lesson: implement changes slowly and incrementally. Verify each change works before moving on, and only deploy once confidence is high.

Engineering terms that describe this:

- Scope creep / over-scoping
- Big-bang rewrite risk
- Regression (feature regression)
- Incremental delivery (preferred approach)
- Progressive rollout with validation
