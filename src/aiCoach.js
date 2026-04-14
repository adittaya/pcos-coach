// AI Coach Engine — context-aware PCOS responses
// Replace generateResponse() with a real API call when ready

import { dailyLog, weightHistory, cycle, symptomHistory, goals } from './store'

function today() { return new Date().toISOString().split('T')[0] }

const RESPONSES = {
  greeting: [
    "Hey! How's your day going? Remember, every small step counts with PCOS management. 💪",
    "Hi there! Ready to crush your health goals today? What can I help with?",
    "Hello! I'm here for you. Whether it's food, fitness, or just venting about PCOS — I'm all ears. 🤗",
  ],

  food_general: [
    () => {
      const totals = dailyLog.getTotals(today())
      const g = goals.get()
      const remaining = g.calories - totals.calories
      if (remaining > 500) return `You've eaten ${totals.calories} cal so far today — about ${remaining} cal remaining. For PCOS, focus on getting more protein (you're at ${totals.protein}g/${g.protein}g). Try a chicken salad or Greek yogurt! 🥗`
      if (remaining > 0) return `Nice tracking! You're at ${totals.calories} cal with ${remaining} to go. Your protein is ${totals.protein}g — getting close to your ${g.protein}g goal. Great work! 💪`
      return `You've hit your calorie target! You're at ${totals.calories}/${g.calories} cal. How are you feeling? If you're still hungry, reach for protein-rich snacks like eggs or nuts. 🥜`
    },
    "For PCOS, the best foods are: salmon (omega-3s), leafy greens (magnesium), berries (antioxidants), eggs (protein + choline), and nuts (healthy fats). Avoid white bread, sugary drinks, and processed snacks. 🐟🥗",
    "A good PCOS plate: 1/2 non-starchy veggies, 1/4 lean protein, 1/4 complex carbs (sweet potato, quinoa). Add healthy fats like avocado. This combo keeps blood sugar stable. 🍽️",
  ],

  food_breakfast: [
    "Best PCOS breakfasts: Greek yogurt with berries & chia, veggie egg scramble with avocado, or a protein smoothie with spinach. These keep blood sugar stable all morning! 🌅",
    "Skip the cereal and toast! Try: overnight oats with almond butter, eggs with sautéed greens, or a chia pudding. High protein + healthy fats = no crash by 10am. 🥣",
  ],

  food_snacks: [
    "Great PCOS snacks: apple + almond butter, hard-boiled eggs, hummus with veggies, handful of mixed nuts, or dark chocolate (85%+) with berries. All keep insulin stable! 🍎",
  ],

  food_avoid: [
    "Foods to limit with PCOS: white rice/bread/pasta, sugary drinks, processed snacks, excessive dairy (can worsen acne for some), fried foods, and alcohol. Focus on whole foods instead. 🚫",
  ],

  workout_general: [
    "For PCOS, the best exercise mix is: 3x strength training + 2x low-impact cardio + daily walks. Strength training improves insulin sensitivity better than cardio alone! 💪",
    "Remember: with PCOS, more isn't always better. Over-exercising raises cortisol, which can worsen symptoms. 30-45 min sessions, 4-5x per week is the sweet spot. 🎯",
  ],

  workout_today: () => {
    const log = dailyLog.get(today())
    if (log.workouts.length > 0) {
      return `You've already completed ${log.workouts.length} workout(s) today and burned ${log.caloriesBurned} cal! Great job! 🔥 Want a cool-down stretch recommendation?`
    }
    return `You haven't logged a workout yet today! How about a 25-min brisk walk? It's cortisol-friendly and great for PCOS. Or check the Workouts tab for more options. 🚶‍♀️`
  },

  weight_general: [
    () => {
      const p = JSON.parse(localStorage.getItem('pcos_profile') || '{}')
      const current = weightHistory.getAll()
      if (current.length < 2) return "I don't have enough weight data yet. Start logging your weight daily in the Progress tab — I'll track trends for you! 📊"
      const latest = current[current.length - 1]
      const first = current[0]
      const diff = latest.weight - first.weight
      const direction = diff < 0 ? 'lost' : diff > 0 ? 'gained' : 'maintained'
      return `You've ${direction} ${Math.abs(diff).toFixed(1)} lbs since you started tracking. Your current weight is ${latest.weight} lbs. ${diff < 0 ? 'Amazing progress! 🎉' : 'Weight with PCOS fluctuates a lot — focus on trends, not daily numbers. 💪'}`
    },
    "With PCOS, weight loss is slower due to insulin resistance. A healthy rate is 0.5-1 lb per week. Don't compare yourself to non-PCOS timelines. Focus on: consistent protein intake, strength training, sleep, and stress management. 📉",
  ],

  weight_log: (weight) => {
    weightHistory.add(weight)
    dailyLog.setWeight(today(), weight)
    return `Logged ${weight} lbs! I'm tracking your trend over time. Remember, PCOS weight fluctuates — don't stress over daily changes. The weekly trend is what matters. 📊`
  },

  symptoms_general: [
    () => {
      const common = symptomHistory.getMostCommon()
      if (common.length === 0) return "I don't have symptom data yet. Log your symptoms in the Progress tab daily — I'll spot patterns and suggest interventions! 🩺"
      return `Your most common symptoms this month: ${common.join(', ')}. I'm noticing patterns. Want specific advice for managing any of these? For example, dietary changes can help with bloating and fatigue. 💡`
    },
  ],

  cycle: [
    () => {
      const phase = cycle.getPhase()
      const day = cycle.getCurrentDay()
      if (!day) return "No cycle data yet! Log your period start date in the Progress → Cycle tab. This helps me give phase-specific nutrition and workout advice. 🌙"
      const advice = {
        'Menstrual': "You're in your menstrual phase. Focus on: iron-rich foods (spinach, red meat), gentle movement (walking, yoga), extra rest. Your body is working hard! 🩸",
        'Follicular': "Follicular phase — energy is rising! Great time for: higher intensity workouts, trying new exercises, social activities. Estrogen is climbing. 🌱",
        'Ovulatory': "Ovulatory phase — peak energy! You can handle: HIIT, heavy lifting, ambitious workouts. Your body is at its strongest right now. 🔥",
        'Luteal': "Luteal phase — wind down. Focus on: B6-rich foods (chickpeas, bananas), magnesium, moderate exercise, stress management. Progesterone is rising. 🌙",
      }
      return `Day ${day} of your cycle — ${phase} phase. ${advice[phase] || ''}`
    },
  ],

  pcos_general: [
    "PCOS is a hormonal condition affecting 1 in 10 women. Key management pillars: 1) Blood sugar control (diet + exercise), 2) Stress management (cortisol affects everything), 3) Sleep (7-9 hrs), 4) Consistent movement. You're already working on this! 💪",
    "Supplements worth discussing with your doctor: Inositol (40:1 myo:d-chiro ratio), Vitamin D, Omega-3, Berberine, Magnesium. These have good research for PCOS. Always check with your doc first! 💊",
    "Insulin resistance is at the core of most PCOS symptoms. The good news: it's very responsive to lifestyle changes. Strength training + balanced meals + good sleep can make a huge difference. You've got this! 🎯",
  ],

  motivation: [
    "You're doing better than you think. PCOS is a marathon, not a sprint. Every healthy meal, every workout, every good night's sleep — it all adds up. I'm proud of you. ❤️",
    "Some days are harder than others. That's normal. What matters is showing up, not being perfect. You logged in today — that already puts you ahead. Keep going! ⚡",
    "Remember: you're not broken, and you're not alone. 1 in 10 women have PCOS. The fact that you're actively managing it makes you a warrior. 🦸‍♀️",
  ],

  fallback: [
    "I'm not sure I understood that. Try asking about: meals, workouts, weight, symptoms, your cycle, or PCOS in general. I'm here to help! 🤖",
    "Hmm, could you rephrase that? I'm best at helping with: nutrition tips, workout plans, symptom tracking, cycle insights, and PCOS management strategies.",
  ],
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function evaluateResponse(response) {
  if (typeof response === 'function') return response()
  return response
}

export function generateResponse(userMessage) {
  const msg = userMessage.toLowerCase().trim()

  // Greetings
  if (/^(hi|hello|hey|sup|what's up|howdy|good\s*(morning|afternoon|evening))/i.test(msg)) {
    return pick(RESPONSES.greeting)
  }

  // Food queries
  if (/breakfast|morning meal|what.*eat.*morning/i.test(msg)) return pick(evaluateResponse(pick(RESPONSES.food_breakfast)))
  if (/snack|hungry between meals/i.test(msg)) return pick(evaluateResponse(pick(RESPONSES.food_snacks)))
  if (/avoid|stop eating|shouldn't eat|bad food|worse food/i.test(msg)) return pick(evaluateResponse(pick(RESPONSES.food_avoid)))
  if (/food|eat|meal|diet|nutrition|calories|macro|protein|carb|fat|hungry|cook|recipe/i.test(msg)) return pick(evaluateResponse(pick(RESPONSES.food_general)))

  // Workout queries
  if (/workout today|exercise today|did.*workout/i.test(msg)) return evaluateResponse(pick(RESPONSES.workout_today))
  if (/workout|exercise|gym|training|fitness|cardio|strength|yoga|hiit|walk|run/i.test(msg)) return pick(evaluateResponse(pick(RESPONSES.workout_general)))

  // Weight queries
  if (/^[\d.]+\s*(lbs?|pounds?|kg|kilos?)$/i.test(msg)) return evaluateResponse(pick(RESPONSES.weight_log(parseFloat(msg))))
  if (/log.*weight|weigh|scale|record.*weight/i.test(msg)) return "Just type your weight (e.g. '158 lbs' or '158') and I'll log it for you! 📊"
  if (/weight|lose|gain|scale|bmi|pound|kilo/i.test(msg)) return pick(evaluateResponse(pick(RESPONSES.weight_general)))

  // Symptom queries
  if (/symptom|feel|pain|ache|tired|fatigue|acne|bloat|headache|craving|insomnia|anxiety/i.test(msg)) return pick(evaluateResponse(pick(RESPONSES.symptoms_general)))

  // Cycle queries
  if (/cycle|period|menstrual|ovulat|luteal|follicular|phase/i.test(msg)) return evaluateResponse(pick(RESPONSES.cycle))

  // General PCOS
  if (/pcos|polycystic|hormone|insulin|resistance|cortisol|supplement|inositol/i.test(msg)) return pick(evaluateResponse(pick(RESPONSES.pcos_general)))

  // Motivation
  if (/tired|give up|can't do|hard|struggling|sad|frustrat|overwhelm|help me|motivat|encourage/i.test(msg)) return pick(RESPONSES.motivation)

  // Thanks
  if (/thank|thanks|thx|appreciate/i.test(msg)) return "You're welcome! That's what I'm here for. Anything else I can help with? 😊"

  // Fallback
  return pick(evaluateResponse(pick(RESPONSES.fallback)))
}
