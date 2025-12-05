import React, { useState, useMemo } from 'react';
import { Mail, Settings, Activity, Clock, Heart, Edit2, Zap, Target, RefreshCw, XCircle } from 'lucide-react';

const MacroCard = ({ title, value, unit, color }) => (
  <div className={`p-4 rounded-xl shadow-lg flex-1 min-w-[120px] bg-white border-b-4 border-${color}-500 transition duration-300 hover:shadow-xl`}>
    <h3 className="text-sm font-semibold text-gray-500 mb-1">{title}</h3>
    <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
    <p className="text-xs text-gray-400 mt-0">{unit}</p>
  </div>
);

const SectionTitle = ({ icon, title, color }) => (
    <div className="flex items-center text-xl font-bold mb-4 mt-8 text-gray-700 border-b-2 border-gray-100 pb-2">
        {React.createElement(icon, { className: `w-6 h-6 mr-3 text-${color}-500` })}
        {title}
    </div>
);

// Banco de Dados de Alimentos (Adicionado Tags de Restrição: 'dairy', 'red_meat', etc.)
const foodDatabase = [
    // Ganho de Massa
    { id: 1, type: 'mass', name: "Peito de Frango (100g)", calories: 165, macros: { P: 31, C: 0, G: 3.6 }, tags: ['poultry'], substitutes: ["Atum em Água (100g)", "Ovos"] },
    { id: 10, type: 'mass', name: "Carne Moída Magra (100g)", calories: 180, macros: { P: 26, C: 0, G: 8 }, tags: ['red_meat'], substitutes: ["Peito de Frango", "Lentilha (cozida)"] },
    { id: 2, type: 'mass', name: "Arroz Integral (100g)", calories: 112, macros: { P: 2.6, C: 25.6, G: 0.9 }, tags: ['grain'], substitutes: ["Batata Doce (100g)", "Quinoa (100g)"] },
    { id: 3, type: 'mass', name: "Ovos Cozidos (unidade)", calories: 78, macros: { P: 6, C: 0.6, G: 5 }, tags: ['egg'], substitutes: ["Queijo Cottage (50g)", "Whey Protein (30g)"] },
    { id: 11, type: 'mass', name: "Leite Integral (200ml)", calories: 120, macros: { P: 6, C: 9, G: 6 }, tags: ['dairy', 'lactose'], substitutes: ["Leite de Amêndoas"] },
    
    // Perda de Peso
    { id: 5, type: 'loss', name: "Filé de Tilápia Assada (100g)", calories: 128, macros: { P: 26, C: 0, G: 2 }, tags: ['fish'], substitutes: ["Salmão Grelhado (50g)", "Tofu Grelhado (100g)"] },
    { id: 6, type: 'loss', name: "Salada de Folhas Verdes", calories: 20, macros: { P: 1, C: 3, G: 0 }, tags: ['vegetable'], substitutes: ["Brócolis Cozido"] },
    { id: 7, type: 'loss', name: "Aveia (30g)", calories: 117, macros: { P: 5, C: 18, G: 2 }, tags: ['grain'], substitutes: ["Chia (15g)"] },
    
    // Manutenção/Geral
    { id: 8, type: 'maintain', name: "Iogurte Natural (170g)", calories: 100, macros: { P: 8, C: 8, G: 4 }, tags: ['dairy', 'lactose'], substitutes: ["Iogurte de Soja"] },
    { id: 9, type: 'maintain', name: "Frutas (100g)", calories: 60, macros: { P: 0.5, C: 15, G: 0.5 }, tags: ['fruit'], substitutes: ["Mix de Castanhas (15g)"] },
    { id: 12, type: 'maintain', name: "Queijo Minas (50g)", calories: 80, macros: { P: 10, C: 1, G: 4 }, tags: ['dairy', 'lactose'], substitutes: ["Queijo Tofu"] },
];

const preferenceOptions = [
    { name: 'dairy_free', label: 'Sem Laticínios', tagsToExclude: ['dairy', 'lactose'] },
    { name: 'no_red_meat', label: 'Sem Carne Vermelha', tagsToExclude: ['red_meat'] },
    { name: 'no_poultry', label: 'Sem Aves', tagsToExclude: ['poultry'] },
    { name: 'no_fish', label: 'Sem Peixe', tagsToExclude: ['fish'] },
];

const MealSchedule = [
  { name: "Café da Manhã", icon: Mail, time: "07:00", factor: 0.20 },
  { name: "Lanche da Manhã", icon: Zap, time: "10:00", factor: 0.08 },
  { name: "Almoço", icon: Settings, time: "13:00", factor: 0.25 },
  { name: "Lanche da Tarde", icon: Activity, time: "16:00", factor: 0.08 },
  { name: "Jantar", icon: Clock, time: "19:00", factor: 0.25 },
  { name: "Ceia", icon: Heart, time: "22:00", factor: 0.14 },
];

const activityFactors = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

// --- Funções de Ajuda ---
const filterFoods = (goal, excludedTags) => {
    return foodDatabase.filter(f => {
        // Filtra pelo objetivo
        const matchesGoal = f.type === goal || f.type === 'maintain';
        // Filtra por restrições: verifica se alguma tag do alimento está na lista de exclusão
        const isExcluded = f.tags.some(tag => excludedTags.includes(tag));
        return matchesGoal && !isExcluded;
    });
};

const generateMealPlan = (finalCals, goal, excludedTags) => {
    const availableFoods = filterFoods(goal, excludedTags);
    const plan = [];

    MealSchedule.forEach(meal => {
        const requiredCals = Math.round(finalCals * meal.factor);

        // Define os grupos de alimentos baseados na disponibilidade e no objetivo
        let proteinFoods = availableFoods.filter(f => f.macros.P > 10);
        let carbFoods = availableFoods.filter(f => f.macros.C > 10);
        let fatGeneralFoods = availableFoods.filter(f => f.macros.P < 10 && f.macros.C < 10); // Vegetais, frutas, etc.

        // Se o filtro removeu as melhores opções, usamos alternativas
        if (proteinFoods.length === 0) proteinFoods = availableFoods.filter(f => f.macros.P > 5);
        if (carbFoods.length === 0) carbFoods = availableFoods.filter(f => f.macros.C > 5);


        // Seleção aleatória do componente principal da refeição (para evitar repetição constante)
        const getRandomFood = (list) => list[Math.floor(Math.random() * list.length)];

        const selectedProtein = getRandomFood(proteinFoods);
        const selectedCarb = getRandomFood(carbFoods);
        const selectedFatGeneral = getRandomFood(fatGeneralFoods);
        
        const mealFoods = [];

        // 1. Proteína (35-40% das calorias da refeição)
        if (selectedProtein) {
            const calsForProtein = requiredCals * 0.40;
            const portion = Math.round(calsForProtein / selectedProtein.calories) * 100;
            if (portion > 0) mealFoods.push({ food: selectedProtein.name, portion: Math.round(portion), unit: 'g/unidade', substitutes: selectedProtein.substitutes });
        }

        // 2. Carboidrato (35-40% das calorias da refeição)
        if (selectedCarb) {
            const calsForCarb = requiredCals * 0.35;
            const portion = Math.round(calsForCarb / selectedCarb.calories) * 100;
            if (portion > 0) mealFoods.push({ food: selectedCarb.name, portion: Math.round(portion), unit: 'g/unidade', substitutes: selectedCarb.substitutes });
        }

        // 3. Vegetal/Geral (O restante)
        if (selectedFatGeneral) {
            mealFoods.push({ food: selectedFatGeneral.name, portion: 100, unit: 'g/unidade', substitutes: selectedFatGeneral.substitutes });
        }

        // Caso extremo: se nada puder ser gerado
        if (mealFoods.length === 0) {
             mealFoods.push({ food: "Necessita de mais opções compatíveis com suas restrições.", portion: 0, unit: '', substitutes: [] });
        }
        
        plan.push({ ...meal, foods: mealFoods, requiredCals });
    });

    return plan;
};
// --- Fim das Funções de Ajuda ---

const App = () => {
  const [userData, setUserData] = useState({
    name: '',
    age: 25,
    height: 175,
    weight: 75,
    sex: 'male',
    goal: 'maintain',
    activityLevel: 'moderate',
  });
  const [preferences, setPreferences] = useState([]); // NOVO ESTADO: Preferências
  const [dietResult, setDietResult] = useState(null);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handlePreferenceChange = (option) => {
    setPreferences(prev => 
      prev.includes(option)
        ? prev.filter(p => p !== option)
        : [...prev, option]
    );
  };

  const calculateDiet = (e) => {
    e && e.preventDefault();

    const { age, height, weight, sex, goal, activityLevel } = userData;
    const factor = activityFactors[activityLevel] || 1.55;
    let bmr;

    if (sex === 'male') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

    let tdee = bmr * factor;

    let finalCals = tdee;
    if (goal === 'mass') {
      finalCals *= 1.15;
    } else if (goal === 'loss') {
      finalCals *= 0.85;
    }

    let proteinPct = 0.25;
    let carbPct = 0.50;
    let fatPct = 0.25;

    if (goal === 'mass') {
      proteinPct = 0.35;
      carbPct = 0.45;
      fatPct = 0.20;
    } else if (goal === 'loss') {
      proteinPct = 0.30;
      carbPct = 0.40;
      fatPct = 0.30;
    }

    const proteinGrams = Math.round((finalCals * proteinPct) / 4);
    const carbGrams = Math.round((finalCals * carbPct) / 4);
    const fatGrams = Math.round((finalCals * fatPct) / 9);
    
    // Lista de tags a serem excluídas baseadas nas preferências
    const excludedTags = preferences.flatMap(prefName => 
        preferenceOptions.find(opt => opt.name === prefName)?.tagsToExclude || []
    );

    // Geração do Plano de Refeições Detalhado com filtro de tags
    const mealPlan = generateMealPlan(finalCals, goal, excludedTags);

    setDietResult({
      tdee: Math.round(tdee),
      finalCals: Math.round(finalCals),
      proteinGrams,
      carbGrams,
      fatGrams,
      goal,
      bmr: Math.round(bmr),
      mealPlan,
    });
  };

  const handleRefreshMeals = () => {
      if (dietResult) {
          const excludedTags = preferences.flatMap(prefName => 
                preferenceOptions.find(opt => opt.name === prefName)?.tagsToExclude || []
          );
          const newMealPlan = generateMealPlan(dietResult.finalCals, dietResult.goal, excludedTags);
          setDietResult(prev => ({...prev, mealPlan: newMealPlan}));
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-inter">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <header className="p-6 bg-indigo-600 text-white flex justify-between items-center shadow-md">
          <h1 className="text-2xl font-extrabold flex items-center">
            <Heart className="w-6 h-6 mr-3" />
            Sistema de Dieta Personalizada
          </h1>
          <button className="p-2 rounded-full hover:bg-indigo-700 transition duration-150">
            <Settings className="w-5 h-5" />
          </button>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 lg:p-10">

          {/* Coluna de Cadastro / Input */}
          <div className="lg:col-span-1 p-6 bg-gray-100 rounded-xl shadow-inner h-fit sticky top-8">
            <SectionTitle icon={Edit2} title="1. Seus Dados e Objetivo" color="indigo" />
            
            <form onSubmit={calculateDiet} className="space-y-4">
              
              {/* Nome, Peso, Altura, Idade, Sexo, Objetivo, Atividade (CAMPOS EXISTENTES) */}
              <input type="text" name="name" placeholder="Seu Nome (Opcional)" value={userData.name} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition duration-150"/>
              <div className="grid grid-cols-3 gap-4">
                <InputGroup label="Peso (kg)" name="weight" type="number" value={userData.weight} onChange={handleChange} />
                <InputGroup label="Altura (cm)" name="height" type="number" value={userData.height} onChange={handleChange} />
                <InputGroup label="Idade" name="age" type="number" value={userData.age} onChange={handleChange} />
              </div>
              <SelectGroup label="Sexo" name="sex" value={userData.sex} onChange={handleChange}>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </SelectGroup>
              <SelectGroup label="Objetivo" name="goal" value={userData.goal} onChange={handleChange}>
                <option value="maintain">Manter Peso</option>
                <option value="mass">Ganhar Massa (+15%)</option>
                <option value="loss">Perder Peso (-15%)</option>
              </SelectGroup>
              <SelectGroup label="Nível de Atividade" name="activityLevel" value={userData.activityLevel} onChange={handleChange}>
                <option value="sedentary">Sedentário (Pouco/Nenhum exercício)</option>
                <option value="light">Leve (1-3 dias/semana)</option>
                <option value="moderate">Moderado (3-5 dias/semana)</option>
                <option value="active">Ativo (6-7 dias/semana)</option>
                <option value="veryActive">Muito Ativo (Treinos intensos diários)</option>
              </SelectGroup>
                
              {/* NOVO: PREFERÊNCIAS ALIMENTARES */}
              <SectionTitle icon={XCircle} title="2. Restrições e Preferências" color="red" />
              <div className="space-y-2">
                {preferenceOptions.map(option => (
                    <CheckboxGroup 
                        key={option.name}
                        label={option.label}
                        name={option.name}
                        checked={preferences.includes(option.name)}
                        onChange={() => handlePreferenceChange(option.name)}
                    />
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 transform hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
              >
                Gerar Plano Alimentar
              </button>
            </form>
          </div>

          {/* Coluna de Resultados / Output */}
          <div className="lg:col-span-2">
            {dietResult ? (
              <div className="space-y-10">
                <SectionTitle icon={Target} title={`Plano Sugerido: ${userData.name || 'Usuário'}`} color="green" />
                
                {/* Resumo Calórico e de Macros */}
                <div className="bg-green-50 p-6 rounded-xl shadow-lg border-l-8 border-green-400">
                    <p className="text-xl font-semibold text-gray-700 mb-3">Sua Necessidade Calórica</p>
                    <div className="flex justify-between items-center text-sm">
                        <p className="text-gray-500">TDEE (Gasto Total): <span className="font-bold text-gray-800">{dietResult.tdee} kcal</span></p>
                        <p className="text-gray-500">BMR (Metabolismo Basal): <span className="font-bold text-gray-800">{dietResult.bmr} kcal</span></p>
                    </div>
                    <p className="text-4xl font-extrabold text-green-700 mt-2 text-center">
                        {dietResult.finalCals} <span className="text-2xl font-semibold">kcal/dia</span>
                    </p>
                    <p className="text-sm text-center text-gray-500 mt-1">
                        {dietResult.goal === 'mass' ? 'Ajustado em +15% para Ganho de Massa.' : dietResult.goal === 'loss' ? 'Ajustado em -15% para Perda de Peso.' : 'Manutenção de Peso (Ajuste Neutro).'}
                    </p>
                </div>

                {/* Macros */}
                <SectionTitle icon={Activity} title="Distribuição de Macronutrientes" color="green" />
                <div className="flex flex-wrap gap-4 justify-between">
                  <MacroCard title="Proteínas" value={dietResult.proteinGrams} unit="gramas" color="blue" />
                  <MacroCard title="Carboidratos" value={dietResult.carbGrams} unit="gramas" color="orange" />
                  <MacroCard title="Gorduras" value={dietResult.fatGrams} unit="gramas" color="red" />
                  {/* Exibição do % de Macros */}
                  <div className="text-center text-sm text-gray-500 flex-1 min-w-[120px] pt-4">
                     <p>P: {(dietResult.proteinGrams * 4 / dietResult.finalCals * 100).toFixed(0)}%</p>
                     <p>C: {(dietResult.carbGrams * 4 / dietResult.finalCals * 100).toFixed(0)}%</p>
                     <p>G: {(dietResult.fatGrams * 9 / dietResult.finalCals * 100).toFixed(0)}%</p>
                  </div>
                </div>

                {/* Planejamento de Refeições */}
                <div className="flex justify-between items-center">
                    <SectionTitle icon={Clock} title="Plano Detalhado de Refeições" color="indigo" />
                    <button 
                        onClick={handleRefreshMeals}
                        className="flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition duration-150"
                        title="Gerar novas sugestões de alimentos (mantendo os cálculos)"
                    >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Alternar Sugestões
                    </button>
                </div>

                <div className="space-y-6">
                    {dietResult.mealPlan.map((meal, index) => (
                        <MealItemDetailed 
                            key={index}
                            meal={meal}
                            color={index % 2 === 0 ? 'indigo' : 'gray'}
                        />
                    ))}
                </div>

                {/* Botões de Ação */}
                <div className="flex justify-end space-x-4 pt-4">
                    <button className="py-2 px-4 border border-indigo-500 text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 transition duration-150">
                        Salvar Plano
                    </button>
                    <button className="py-2 px-4 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150">
                        Gerar PDF (Opcional)
                    </button>
                </div>

              </div>
            ) : (
              <div className="p-10 text-center bg-gray-50 rounded-xl shadow-lg border-2 border-dashed border-gray-300">
                <p className="text-xl font-semibold text-gray-500">
                  Preencha seus dados e clique em "Gerar Plano Alimentar" para visualizar seu resumo calórico e sugestão de dieta.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

// Componente Auxiliar para o Input
const InputGroup = ({ label, name, type, value, onChange }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 transition duration-150"
    />
  </div>
);

// Componente Auxiliar para o Select
const SelectGroup = ({ label, name, value, onChange, children }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full p-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500 transition duration-150"
    >
      {children}
    </select>
  </div>
);

// Componente Auxiliar NOVO: Checkbox para Preferências
const CheckboxGroup = ({ label, name, checked, onChange }) => (
    <label htmlFor={name} className="flex items-center cursor-pointer p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition duration-150">
        <input
            id={name}
            type="checkbox"
            name={name}
            checked={checked}
            onChange={onChange}
            className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
        />
        <span className="ml-3 text-sm font-medium text-gray-700">{label}</span>
    </label>
);

// Componente Auxiliar Detalhado de Refeição
const MealItemDetailed = ({ meal, color }) => {
    return (
        <div className={`p-4 rounded-xl bg-white border-2 border-${color}-100 shadow-md`}>
            <div className={`flex items-center mb-3 pb-2 border-b border-gray-100 text-${color}-600`}>
                <div className={`p-2 rounded-full bg-${color}-500 text-white mr-3`}>
                    {React.createElement(meal.icon, { className: "w-5 h-5" })}
                </div>
                <h4 className="text-xl font-bold">{meal.name} <span className="text-sm font-normal text-gray-500">({meal.time} - Aprox. {meal.requiredCals} kcal)</span></h4>
            </div>

            <ul className="space-y-3">
                {meal.foods.map((item, index) => (
                    <li key={index} className="pl-3 border-l-4 border-dashed border-gray-200">
                        <p className="text-base font-semibold text-gray-700">
                            {item.food} - <span className="font-bold text-lg text-green-600">{item.portion} {item.unit}</span>
                        </p>
                        {item.substitutes && item.substitutes.length > 0 && (
                            <p className="text-xs text-gray-400 mt-0">
                                Substitutos: {item.substitutes.join(', ')}
                            </p>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default App;
