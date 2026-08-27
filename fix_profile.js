const fs = require('fs');

let useUserCode = fs.readFileSync('src/hooks/useUser.ts', 'utf8');
const searchBlock = '        if (profileData) {\n          setProfile(profileData);\n        }';
const replaceBlock = '        if (profileData) {\n          const meta = user.user_metadata || {};\n          setProfile({\n            ...profileData,\n            bio: meta.bio || profileData.bio,\n            website_url: meta.website_url || profileData.website_url,\n            twitter_url: meta.twitter_url || profileData.twitter_url,\n            amazon_url: meta.amazon_url || profileData.amazon_url\n          });\n        }';
useUserCode = useUserCode.replace(searchBlock, replaceBlock);
fs.writeFileSync('src/hooks/useUser.ts', useUserCode, 'utf8');

let pageCode = fs.readFileSync('src/app/profile/page.tsx', 'utf8');
const handleSaveStart = '  const handleSave = async () => {';
const handleSaveEnd = '  };';
const handleSaveRegex = /  const handleSave = async \(\) => \{[\s\S]*?  \};/;
const newHandleSave =   const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          bio: bio,
          website_url: websiteUrl,
          twitter_url: twitterUrl,
          amazon_url: amazonUrl,
        }
      });

      if (authError) throw authError;

      setMessage("Profil mis à jour avec succès !");
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };;

pageCode = pageCode.replace(handleSaveRegex, newHandleSave);
fs.writeFileSync('src/app/profile/page.tsx', pageCode, 'utf8');
console.log("Done");
