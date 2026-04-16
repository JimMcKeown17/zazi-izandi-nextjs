I want to add an personalized AI support chatbot to each EA. Please read  /Users/jimmckeown/Development/Zazi_iZandi_Website_2026/zazi-izandi-nextjs/documentation/zazi_izandi_programme_guide.md to familiarize yourself with the programme. 

The EAs do not receive a lot of training and are quickly thrown out into the classrooms to implement the programme. As a result, many miss the core aspects of the programme and end up teaching letters in the wrong order, teaching every group the same letters, not  following teach at the right level principles, and more. See our quality flags in /pm for examples of common mistakes. 

I want to give each EA an AI that holds the curriculum in it's head, allowing the EA to offload some of that cognitive load and focus on just providing an amazing experience to the children.

Tech Stack
I want to start with OpenAI models and use a combination of the OpenAI SDK and Vercel AI SDK. Please use your ai-sdk and openai-docs skills extensively. Feel free to use Context7 MCP if needed.

The end goal would be:
An EA can log in (with Clerk) and the system identifies the user and provides the AI w/ info relevant to that user/EA only. The EA then gets custom analysis of how they're doing along with suggestions of what to do next.

Some examples of helpful things would be:

Providing Suggestions for Today's Work. For example:
- "It looks like today, you should try working with groups 3, 4, and 5 since your last session yesterday was with Group 2"
- "Last week, you did letters S & T with group 3. It's always a good idea to review the same letters, perhaps adding in the letter N. However, if you're confident they've mastered S & T, let's move on to N and P. I skipped the letter I on your letter tracker as majority of your children have mastered it already on the baseline"

Analyzing Overall EA Implementation/Compliance
- "I noticed you're doing the same letters with groups 4,5, and 6. A friendly reminder that we want to be teaching each group at their current level. If I look at the children's baseline results, it looks like Group 6 should be working on letters, l, k, and e. While groups 4 and 5 are earlier on the letter tracker. A core principle of Zazi iZandi is teaching at the right level, which means teaching children letters (in order from left to right on our letter tracker) that they do not yet know. It's not 'wrong' to review letters they already know, so you aren't hurting the children. But they'll learn fastest if we work with them at their own level."
- "It looks like your group 5 hasn't had a session in 2 weeks."
- "So far this year, you're averaging 2.1 sessions per day. This puts you ahead of 42% of other EAs. Let's try to get in the upper half with a strong week!"
- "It looks like you've been teaching group 3 children some letters they already know. Let's try working on some letters they don't know yet. If I look at their letter tracker gaps, from left to right, it seems like we should work on letters C and F today.

Providing Confidence/Praise
- "You've completed more sessoins than 75% of EAs this week. Well done, that's amazing. You're making a true impact on the kids."

--

We'll have to create some skills (use your skill creator skills) and/or tools for the LLM to query data if it needs to.

We can build this incrementally.

I 100% need guardrails against them using the chatbot for other purposes and/or making too many tool calls. We'll have to limit answers to X number per day so I don't run up a big API bill.

--

Future plans
Add voice

Spin off ideas
Have AI analyze an EAs performance overnight and create a little "one-pager" for them with suggestions, daily plan, things to fix, etc. So not a chat bot, but an updated progerss page
Have the chatbot be available via Telegram and/or WhatsApp. Perhpas eventually our mobile app.