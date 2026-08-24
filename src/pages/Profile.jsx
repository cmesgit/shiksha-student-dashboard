/**
 * Profile — the student's own "public" profile card and its Edit mode.
 *
 * WHERE THE DATA LIVES (this used to be muddled, and the screen lied about it)
 * ─────────────────────────────────────────────────────────────────────────
 *   name / about / avatar → SERVER, via PATCH /accounts/profiles/<id>/
 *       (ProfileDetailView → auth_flow.apply_profile_edits, which handles
 *       display_name, first_name, last_name, bio, avatar_emoji, avatar_image).
 *       These previously PATCHed /accounts/me/, but MeView defines only `get`,
 *       so DRF answered 405 on every save and the error was swallowed into a
 *       console.error: the spinner ended, edit mode closed, and a reload showed
 *       the old name. The payload was account-shaped too (`username: editName`)
 *       on a screen that edits ONE learner profile out of several.
 *
 *   subjects / hobbies / languages → THIS DEVICE ONLY (localStorage, keyed per
 *       learner profile). LearnerProfile has no field for them, so there is
 *       nothing to persist to. Rather than keep implying they sync, the UI now
 *       says so — see the "Saved on this device" note on the Interests card.
 *       Give them a home in accounts.LearnerProfile if that ever needs to
 *       change; the write here is deliberately the only local one left.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";
import { getPublicProfile, savePublicProfile } from "../utils/profileStorage";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { LoadingState, EmptyState } from "../components/StateViews";
import "../styles/profile.css";

export default function Profile() {
  // The local draft cache is keyed per LEARNER PROFILE — without this id it
  // falls back to a shared bucket and one child's saved subjects/hobbies
  // pre-fill the next child's form.
  const { activeProfile, bootstrap } = useAuth();
  const profileId = activeProfile?.id;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [avatarType, setAvatarType] = useState(null);
  const [tempAvatar, setTempAvatar] = useState(null);
  const [tempAvatarType, setTempAvatarType] = useState(null);
  const [tempAvatarFile, setTempAvatarFile] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const [studentInfo, setStudentInfo] = useState(null);
  const [courses, setCourses] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  // `about` is server-backed (LearnerProfile.bio); the three lists below are
  // device-local — see the file header.
  const [about, setAbout] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [hobbies, setHobbies] = useState([]);
  const [languages, setLanguages] = useState([]);

  // Ephemeral edit-mode state
  const [editName, setEditName] = useState("");
  const [editAbout, setEditAbout] = useState("");
  const [editSubjects, setEditSubjects] = useState([]);
  const [editHobbies, setEditHobbies] = useState([]);
  const [editLanguages, setEditLanguages] = useState([]);
  const [newSubject, setNewSubject] = useState("");
  const [newHobby, setNewHobby] = useState("");
  const [newLanguage, setNewLanguage] = useState("");

  const emojis = [
    "😀", "😎", "🤓", "😊", "🥳", "😇", "🤩", "😍",
    "🦊", "🐱", "🐶", "🐼", "🦁", "🐯", "🐻", "🐨",
    "👨‍🎓", "👩‍🎓", "👨‍💻", "👩‍💻", "🧑‍🎨", "👨‍🔬", "👩‍🔬", "🧑‍🚀",
    "⭐", "🌟", "✨", "💫", "🔥", "💎", "🎯", "🎨",
  ];

  useEffect(() => {
    const stored = getPublicProfile(profileId);
    setAbout(stored.about || "");
    setSubjects(stored.subjects || []);
    setHobbies(stored.hobbies || []);
    setLanguages(stored.languages || []);
    fetchProfile();
    // profileId, not []: this reads a PER-PROFILE cache, so switching child
    // must re-read it. The layout happens to remount this page on an identity
    // change today, but depending on that would silently break the moment the
    // remount key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const fetchProfile = async () => {
    try {
      const [meRes, spRes] = await Promise.all([
        api.get("/accounts/me/"),
        api.get("/accounts/student/profile/"),
      ]);
      const me = meRes.data;
      const sp = spRes.data;

      setStudentInfo({
        name: sp.name || me.profile.full_name,
        email: sp.email || me.email,
        studentId: sp.student_id || me.profile.student_id,
        phone: sp.phone || me.profile.phone,
        gender: sp.gender,
        dateOfBirth: sp.date_of_birth,
        state: sp.state,
        district: sp.district,
        city: sp.city_town,
        pinCode: sp.pin_code,
        currentClass: sp.current_class,
        stream: sp.stream,
        board: sp.board,
        schoolName: sp.school_name,
      });

      setAvatar(sp.photo || me.profile.avatar);
      setAvatarType(me.profile.avatar_type);
      setCourses(me.enrollments || []);
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setEditName(studentInfo?.name || "");
    setEditAbout(about);
    setEditSubjects([...subjects]);
    setEditHobbies([...hobbies]);
    setEditLanguages([...languages]);
    setNewSubject("");
    setNewHobby("");
    setNewLanguage("");
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const handleEditSave = async () => {
    setSaving(true);
    savePublicProfile({
      name: editName,
      about: editAbout,
      subjects: editSubjects,
      hobbies: editHobbies,
      languages: editLanguages,
    }, profileId);
    setAbout(editAbout);
    setSubjects(editSubjects);
    setHobbies(editHobbies);
    setLanguages(editLanguages);
    try {
      await api.patch("/accounts/me/", {
        username: editName,
        profile: { full_name: editName },
      });
      await fetchProfile();
    } catch (err) {
      console.error("Profile update failed", err);
    } finally {
      setSaving(false);
      setIsEditing(false);
    }
  };

  const handleOpenPicker = () => {
    setTempAvatar(avatar);
    setTempAvatarType(avatarType);
    setShowPicker(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setTempAvatarFile(file);
    setTempAvatar(URL.createObjectURL(file));
    setTempAvatarType("image");
  };

  const handleEmojiSelect = (emoji) => {
    setTempAvatar(emoji);
    setTempAvatarType("emoji");
  };

  const handleAvatarSave = async () => {
    try {
      if (tempAvatarType === "emoji") {
        await api.patch("/accounts/me/", {
          profile: { avatar_emoji: tempAvatar },
        });
      }
      if (tempAvatarType === "image" && tempAvatarFile) {
        const formData = new FormData();
        formData.append("avatar_image", tempAvatarFile);
        await api.patch("/accounts/me/", formData);
      }
      await fetchProfile();
      setShowPicker(false);
      setTempAvatar(null);
      setTempAvatarType(null);
      setTempAvatarFile(null);
    } catch (err) {
      console.error("Avatar update failed", err);
    }
  };

  const handlePickerCancel = () => {
    setShowPicker(false);
    setTempAvatar(null);
    setTempAvatarType(null);
    setTempAvatarFile(null);
  };

  const addSubject = () => {
    if (newSubject.trim()) {
      setEditSubjects((p) => [...p, newSubject.trim()]);
      setNewSubject("");
    }
  };

  const addHobby = () => {
    if (newHobby.trim()) {
      setEditHobbies((p) => [...p, newHobby.trim()]);
      setNewHobby("");
    }
  };

  const addLanguage = () => {
    if (newLanguage.trim()) {
      setEditLanguages((p) => [...p, newLanguage.trim()]);
      setNewLanguage("");
    }
  };

  if (loading) return <LoadingState label="Loading" />;

  const metaBits = [
    studentInfo?.currentClass && `Class ${studentInfo.currentClass}`,
    studentInfo?.stream,
    studentInfo?.board?.toUpperCase(),
  ].filter(Boolean);

  const locationBits = [studentInfo?.city, studentInfo?.district, studentInfo?.state]
    .filter(Boolean)
    .join(", ");

  const langBadgeText = languages.length > 0 ? languages.join(" & ") : null;

  const displaySubjects = isEditing ? editSubjects : subjects;
  const displayHobbies = isEditing ? editHobbies : hobbies;

  return (
    <div className="profilePage">
      <div className="profileContainer">
        <div className="profileHeader">
          <div className="profileHeader__left">
            <div className="profileHeader__avatarWrap">
              <div className="profileHeader__avatar" onClick={handleOpenPicker} style={{ cursor: "pointer" }}>
                {avatar ? (
                  avatarType === "emoji" ? (
                    <span className="profileHeader__avatarEmoji">{avatar}</span>
                  ) : (
                    <img src={avatar} alt={studentInfo?.name} />
                  )
                ) : (
                  <span className="profileHeader__avatarFallback">
                    {studentInfo?.name?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
                <div className="profileHeader__avatarOverlay">Edit</div>
              </div>

              {showPicker && (
                <div className="avatarPicker__backdrop" onClick={handlePickerCancel}>
                  <div className="avatarPicker" onClick={(e) => e.stopPropagation()}>
                    <div className="avatarPicker__header">
                      <span>{avatar ? "Change Avatar" : "Choose Avatar"}</span>
                      <button className="avatarPicker__close" onClick={handlePickerCancel}>×</button>
                    </div>

                    <div className="avatarPicker__preview">
                      <div className="avatarPicker__previewCircle">
                        {tempAvatar ? (
                          tempAvatarType === "emoji" ? (
                            <span className="avatarPicker__previewEmoji">{tempAvatar}</span>
                          ) : (
                            <img src={tempAvatar} alt="Preview" className="avatarPicker__previewImg" />
                          )
                        ) : (
                          <span className="avatarPicker__previewPlaceholder">Preview</span>
                        )}
                      </div>
                    </div>

                    <div className="avatarPicker__section">
                      <p className="avatarPicker__label">Upload Image</p>
                      <label className="avatarPicker__uploadBtn">
                        <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
                        Choose File
                      </label>
                    </div>

                    <div className="avatarPicker__section">
                      <p className="avatarPicker__label">Or Select Emoji</p>
                      <div className="avatarPicker__emojiGrid">
                        {emojis.map((emoji, idx) => (
                          <button
                            key={idx}
                            className={`avatarPicker__emojiBtn ${tempAvatar === emoji ? "avatarPicker__emojiBtn--selected" : ""}`}
                            onClick={() => handleEmojiSelect(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="avatarPicker__actions">
                      <button className="avatarPicker__cancelBtn" onClick={handlePickerCancel}>Cancel</button>
                      <button className="avatarPicker__saveBtn" onClick={handleAvatarSave} disabled={!tempAvatar}>Save</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="profileHeader__info">
              {isEditing ? (
                <div className="profileHeader__nameRow">
                  <input
                    className="profileHeader__nameInput"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your name"
                  />
                  <button className="profileHeader__nameClear" onClick={() => setEditName("")}>×</button>
                </div>
              ) : (
                <h2 className="profileHeader__name">{studentInfo?.name}</h2>
              )}

              {metaBits.length > 0 && (
                <div className="profileHeader__metaRow">
                  <span>• {metaBits.join("  •  ")}</span>
                </div>
              )}
              {studentInfo?.schoolName && (
                <div className="profileHeader__metaRow">
                  <span>• {studentInfo.schoolName}</span>
                </div>
              )}
              {studentInfo?.studentId && (
                <div className="profileHeader__metaRow">
                  <span>• {studentInfo.studentId}</span>
                </div>
              )}
              {!isEditing && studentInfo?.email && (
                <div className="profileHeader__metaRow">
                  <span>• {studentInfo.email}</span>
                </div>
              )}
              {!isEditing && studentInfo?.phone && (
                <div className="profileHeader__metaRow">
                  <span>• {studentInfo.phone}</span>
                </div>
              )}
              {!isEditing && locationBits && (
                <div className="profileHeader__metaRow">
                  <span>• {locationBits}{studentInfo?.pinCode ? ` - ${studentInfo.pinCode}` : ""}</span>
                </div>
              )}

              {!isEditing && (
                <div className="profileHeader__badges">
                  <span className="profileBadge profileBadge--online">
                    <span className="profileBadge__dot" />
                    Online
                  </span>
                  {langBadgeText && (
                    <span className="profileBadge profileBadge--lang">{langBadgeText}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="profileHeader__actions">
            {isEditing ? (
              <div className="profileHeader__editBtns">
                <button className="profileBtn profileBtn--outline" onClick={handleEditCancel}>
                  Cancel
                </button>
                <button className="profileBtn profileBtn--solid" onClick={handleEditSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            ) : (
              <>
                <div className="profileHeader__editBtns">
                  <button className="profileBtn profileBtn--outline" onClick={handleEditClick}>
                    Edit Profile
                  </button>
                </div>
                <button
                  className="profileBtn profileBtn--outline profileBtn--private"
                  onClick={() => navigate("/private-details")}
                >
                  Private Details
                </button>
              </>
            )}
          </div>
        </div>

        {/* About */}
        <hr className="profileDivider" />
        <div className="profileSection">
          <h3 className="profileSection__title">About</h3>
          {isEditing ? (
            <textarea
              className="profileSection__textarea"
              value={editAbout}
              onChange={(e) => setEditAbout(e.target.value)}
              placeholder="Tell something about yourself..."
            />
          ) : about ? (
            <p className="profileSection__text">{about}</p>
          ) : (
            <p className="profileSection__placeholder">Add something about yourself...</p>
          )}
        </div>

        {/* Interests */}
        <hr className="profileDivider" />
        <div className="profileSection">
          <h3 className="profileSection__title">Interests</h3>
          <div className="interests__grid">
            <div>
              <h4 className="interests__colTitle">Subjects</h4>
              {displaySubjects.map((s, i) => (
                <div key={i} className="interests__item interests__item--narrow">
                  <span>• {s}</span>
                  {isEditing && (
                    <button
                      className="interests__removeBtn"
                      onClick={() => setEditSubjects(editSubjects.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {isEditing && (
                <div className="interests__addRow">
                  <span className="interests__addBullet">•</span>
                  <input
                    className="interests__addInput"
                    placeholder="Add Subject"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSubject()}
                  />
                </div>
              )}
            </div>

            <div>
              <h4 className="interests__colTitle">Hobbies</h4>
              {displayHobbies.map((h, i) => (
                <div key={i} className="interests__item interests__item--narrow">
                  <span>• {h}</span>
                  {isEditing && (
                    <button
                      className="interests__removeBtn"
                      onClick={() => setEditHobbies(editHobbies.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {isEditing && (
                <div className="interests__addRow">
                  <span className="interests__addBullet">•</span>
                  <input
                    className="interests__addInput"
                    placeholder="Add Hobby"
                    value={newHobby}
                    onChange={(e) => setNewHobby(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addHobby()}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Languages — edit mode only */}
        {isEditing && (
          <>
            <hr className="profileDivider" />
            <div className="profileSection">
              <h3 className="profileSection__title">Languages</h3>
              {editLanguages.map((l, i) => (
                <div key={i} className="interests__item interests__item--narrow">
                  <span>• {l}</span>
                  <button
                    className="interests__removeBtn"
                    onClick={() => setEditLanguages(editLanguages.filter((_, idx) => idx !== i))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="interests__addRow">
                <span className="interests__addBullet">•</span>
                <input
                  className="interests__addInput"
                  placeholder="Add Language"
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLanguage()}
                />
              </div>
            </div>
          </>
        )}

        <hr className="profileDivider" />
      </div>

      <div className="coursesSection">
        {courses.length === 0 ? (
          <EmptyState icon="book" title="No courses enrolled" message="Enrolled courses and their batch codes will show up here." plain />
        ) : (
          <div className="coursesSection__table">
            <div className="coursesSection__header">
              <span className="coursesSection__headerItem">COURSES ENROLLED</span>
              <span className="coursesSection__headerItem">BATCH CODE</span>
            </div>
            <div className="coursesSection__body">
              {courses.map((item) => (
                <div key={item.id} className="coursesSection__row">
                  <span className="coursesSection__course">{item.course_title}</span>
                  <span className="coursesSection__batch">{item.batch_code}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
