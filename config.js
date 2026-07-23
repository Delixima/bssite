// À remplacer par les valeurs de ton projet Supabase (Settings > API)
const SUPABASE_URL = "https://szalnsbvgrrjykkgyshg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6YWxuc2J2Z3Jyanlra2d5c2hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NjY2ODcsImV4cCI6MjEwMDA0MjY4N30.-J6hP-LqyJsxuELHwjEYSJu2ucWm21asAghIXy0GHjw";

const RANG_LABELS = {
  scientifique_test: "Scientifique en Test",
  scientifique_confirme: "Scientifique Confirmé",
  scientifique_sous_chef: "Scientifique Sous-Chef",
  scientifique_chef: "Scientifique en Chef",
  co_gerant: "Co-gérant",
  gerant: "Gérant",
  dirigeant: "Dirigeant"
};

const ACCREDITATION = {
  scientifique_test: 0,
  scientifique_confirme: 1,
  scientifique_sous_chef: 2,
  scientifique_chef: 3,
  co_gerant: 4,
  gerant: 4,
  dirigeant: 4
};

const CLASSE_NIVEAU = { Verte: 0, Orange: 1, Rose: 2, Noire: 3 };

const STATUT_LABELS = { en_attente: "en attente", valide: "validé", refuse: "refusé" };
