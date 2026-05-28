#py training/exploration_visuals.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

# Importe ta fonction de chargement
from data.postgres_loader import load_data  # adapte le chemin selon ton projet

# Configuration matplotlib
plt.rcParams['figure.figsize'] = (10, 6)
plt.rcParams['font.size'] = 10
sns.set_style("whitegrid")

# Crée le dossier pour les figures
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "reports" / "figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def generate_all_figures():
    """Génère toutes les figures d'exploration pour le rapport."""
    
    # 1. Charge les données
    print("📊 Chargement des données...")
    df = load_data()
    
    # Ajoute les colonnes utiles
    df['periode'] = df['annee'].astype(int).astype(str) + '-' + df['mois'].astype(int).astype(str).str.zfill(2)
    df['taux_remplissage'] = df['ca_mensuel'] / (df['nb_sessions'] * 15000)  
    df['taux_remplissage'] = df['taux_remplissage'].fillna(0).clip(0, 1)
    
    print(f"✅ {len(df)} mois chargés")
    
    # ============================================
    # FIGURE 1 : Distribution du CA mensuel
    # ============================================
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.hist(df['ca_mensuel'], bins=8, color='skyblue', edgecolor='black', alpha=0.7)
    ax.axvline(df['ca_mensuel'].mean(), color='red', linestyle='--', linewidth=2, 
               label=f'Moyenne: {df["ca_mensuel"].mean():.0f} DT')
    ax.set_xlabel('CA mensuel (DT)', fontsize=12)
    ax.set_ylabel('Fréquence', fontsize=12)
    ax.set_title('Distribution du CA mensuel (13 mois)', fontsize=14, fontweight='bold')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '01_distribution_ca.png', dpi=300, bbox_inches='tight')
    print("✅ Figure 1 sauvegardée : 01_distribution_ca.png")
    plt.close()
    
    # ============================================
    # FIGURE 2 : Évolution temporelle du CA
    # ============================================
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.plot(df['periode'], df['ca_mensuel'], marker='o', linewidth=2.5, 
            markersize=10, color='steelblue', label='CA réel')
    ax.fill_between(range(len(df)), df['ca_mensuel'], alpha=0.3, color='steelblue')
    
    # Annotations des pics et creux
    max_idx = df['ca_mensuel'].idxmax()
    min_idx = df['ca_mensuel'].idxmin()
    ax.annotate(f'Pic: {df.loc[max_idx, "ca_mensuel"]:.0f} DT', 
                xy=(max_idx, df.loc[max_idx, 'ca_mensuel']),
                xytext=(max_idx, df.loc[max_idx, 'ca_mensuel'] + 3000),
                arrowprops=dict(arrowstyle='->', color='red'),
                fontsize=10, color='red')
    
    ax.set_xticks(range(len(df)))
    ax.set_xticklabels(df['periode'], rotation=45, ha='right')
    ax.set_ylabel('CA mensuel (DT)', fontsize=12)
    ax.set_title('Évolution du CA sur 13 mois (Mai 2025 - Mai 2026)', fontsize=14, fontweight='bold')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '02_evolution_ca.png', dpi=300, bbox_inches='tight')
    print("✅ Figure 2 sauvegardée : 02_evolution_ca.png")
    plt.close()
    
    # ============================================
    # FIGURE 3 : Matrice de corrélation
    # ============================================
    # Sélectionne les colonnes numériques pertinentes
    fig, ax = plt.subplots(figsize=(8, 6))

# Renomme les labels pour être plus clair
    corr_matrix = df[['nb_sessions', 'mois_cos', 'ca_mensuel']].corr()
    corr_matrix.index = ['Nombre de sessions', 'Saisonnalité (cos)', 'CA mensuel']
    corr_matrix.columns = ['Nombre de sessions', 'Saisonnalité (cos)', 'CA mensuel']

    sns.heatmap(corr_matrix, annot=True, cmap='RdYlBu_r', center=0, 
    square=True, fmt='.3f', cbar_kws={'shrink': 0.8},
    linewidths=0.5, ax=ax, annot_kws={"size": 14})

    ax.set_title('Matrice de corrélation des variables du modèle', fontsize=14, fontweight='bold')

    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '03_matrice_correlation.png', dpi=300, bbox_inches='tight')
    
    
    # ============================================
    # FIGURE 4 : CA vs Nombre de sessions (scatter)
    # ============================================
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Scatter plot
    scatter = ax.scatter(df['nb_sessions'], df['ca_mensuel'], 
                        s=150, alpha=0.7, color='steelblue', edgecolors='black')
    
    # Ligne de régression
    z = np.polyfit(df['nb_sessions'], df['ca_mensuel'], 1)
    p = np.poly1d(z)
    x_line = np.linspace(df['nb_sessions'].min(), df['nb_sessions'].max(), 100)
    ax.plot(x_line, p(x_line), "r--", linewidth=2, alpha=0.8, label=f'Tendance (R²≈0.6)')
    
    # Labels des points
    for i, row in df.iterrows():
        ax.annotate(row['periode'], (row['nb_sessions'], row['ca_mensuel']),
                   xytext=(5, 5), textcoords='offset points', fontsize=8, alpha=0.7)
    
    ax.set_xlabel('Nombre de sessions planifiées', fontsize=12)
    ax.set_ylabel('CA mensuel (DT)', fontsize=12)
    ax.set_title('Relation entre nombre de sessions et CA', fontsize=14, fontweight='bold')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '04_ca_vs_sessions.png', dpi=300, bbox_inches='tight')
    print("✅ Figure 4 sauvegardée : 04_ca_vs_sessions.png")
    plt.close()
    
    # ============================================
    # FIGURE 5 : Saisonnalité (CA moyen par mois)
    # ============================================
    # Pooler par mois (moyenne sur les 2 années)
    saisonnalite = df.groupby('mois').agg({
        'ca_mensuel': 'mean',
        'nb_sessions': 'mean'
    }).reset_index()
    
    fig, ax1 = plt.subplots(figsize=(12, 6))
    
    mois_labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 
                   'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    colors_bar = ['lightcoral' if m in [7, 8] else 'lightgreen' if m in [6, 9, 10] else 'skyblue' 
                  for m in range(1, 13)]
    
    bars = ax1.bar(range(1, 13), 
                   [saisonnalite[saisonnalite['mois']==m]['ca_mensuel'].values[0] 
                    if m in saisonnalite['mois'].values else 0 
                    for m in range(1, 13)],
                   color=colors_bar, edgecolor='black', alpha=0.8)
    
    ax1.set_xticks(range(1, 13))
    ax1.set_xticklabels(mois_labels)
    ax1.set_ylabel('CA moyen (DT)', fontsize=12, color='steelblue')
    ax1.set_title('Saisonnalité : CA moyen et nombre de sessions par mois', fontsize=14, fontweight='bold')
    ax1.tick_params(axis='y', labelcolor='steelblue')
    
    # Ligne pour nb_sessions
    ax2 = ax1.twinx()
    ax2.plot(range(1, 13), 
             [saisonnalite[saisonnalite['mois']==m]['nb_sessions'].values[0] 
              if m in saisonnalite['mois'].values else 0 
              for m in range(1, 13)],
             color='red', marker='D', linewidth=2, markersize=8, label='Sessions')
    ax2.set_ylabel('Nombre de sessions', fontsize=12, color='red')
    ax2.tick_params(axis='y', labelcolor='red')
    
    # Légende
    from matplotlib.patches import Patch
    legend_elements = [Patch(facecolor='lightgreen', edgecolor='black', label='Haute saison'),
                       Patch(facecolor='lightcoral', edgecolor='black', label='Basse saison (été)'),
                       Patch(facecolor='skyblue', edgecolor='black', label='Moyenne saison')]
    ax1.legend(handles=legend_elements, loc='upper left')
    ax2.legend(loc='upper right')
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '05_saisonnalite.png', dpi=300, bbox_inches='tight')
    print("✅ Figure 5 sauvegardée : 05_saisonnalite.png")
    plt.close()
    
    # ============================================
    # FIGURE 6 : Taux de remplissage
    # ============================================
    fig, ax = plt.subplots(figsize=(12, 6))
    
    bars = ax.bar(range(len(df)), df['taux_remplissage'] * 100, 
                  color=['lightcoral' if t < 0.05 else 'mediumseagreen' if t > 0.15 else 'gold' 
                         for t in df['taux_remplissage']],
                  edgecolor='black', alpha=0.8)
    
    ax.set_xticks(range(len(df)))
    ax.set_xticklabels(df['periode'], rotation=45, ha='right')
    ax.set_ylabel('Taux de remplissage (%)', fontsize=12)
    ax.set_title('Taux de remplissage par mois (CA / Revenu potentiel)', fontsize=14, fontweight='bold')
    ax.axhline(df['taux_remplissage'].mean() * 100, color='red', linestyle='--', 
               linewidth=2, label=f'Moyenne: {df["taux_remplissage"].mean()*100:.1f}%')
    ax.legend()
    ax.grid(True, alpha=0.3, axis='y')
    
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '06_taux_remplissage.png', dpi=300, bbox_inches='tight')
    print("✅ Figure 6 sauvegardée : 06_taux_remplissage.png")
    plt.close()
    
    print(f"\n🎉 Toutes les figures sont sauvegardées dans : {OUTPUT_DIR}")

if __name__ == "__main__":
    generate_all_figures()