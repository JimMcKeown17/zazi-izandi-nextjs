## Project Management
- Let's run a deep analysis on tracking some 'change over time' stuff. Such as people moving from low to high sessions. red to green. or along the scatter plot correctly. This type of project management is super next level.

## Overall Design
- I think we need to move the filter from the overview tab over to the sidebar so it's possible to change on the different sidebar pages.

## AI
- Build AI into the my-kids pages for EAs. Use Vercel AI SDK. Iterate many times.

## Teachers
- Add a teacher page where they can see their kids performance

## Schools
- Add a schools overview page where a principal can see their kids & classrooms's performance

## Info Page
- Add a page with descriptions/explanations of the different ways we're thinking about and viewing the data.

## Other Features
- Blending page
- Page for EAs with 2 classrooms.
- Badges for EAs


## Mentor Page
- Update to pull from newest Mentor Visit API and add to old one. Will require a model migration to add the two new columns
- On mentor visits page, it's not calculating coverage gap correctly b/c of school names.
- Consider adding in Stan's excel sheet and put that alongside our current calculated info on the LCs

## My-Kids Page
- Add horizontal bar chart showing sessions per group
- Consider showing Alignment Stat, session rank vs other EAs (Or something like a cohort - congrats, you've done more sessions than 73% of your peers type of thing), some badge/leaderboard stuff.

## Bugs & Checks
- I have letter orders in 2 places: lib/pm/constants.ts (line 54). and api/letter_constants.py. I should probably only store these in the backend and replace any code pulling them from the frontend.
- Figure out the correct letter orders we should be using.
- Make sure no schools are being thrown off by school holidays.
- See which pages I need to delete the blending groups from, such as the letter alignment calculations.
- Figure out Busisiwe Kampeni (Teampact UserID: 28755) and why she's showing so many sessions for March 18.
- Kampeni appears to be working in more than 1 school. Same with Yonela Lewu. I need to figure out how to deal with that.

