'use client';

import { ArrowLeft, Camera, Save, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useSession } from '../lib/auth-client';
import { useUpdateUser } from '../lib/hooks/use-queries';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';

interface MyProfileProps {
  onBack: () => void;
}

export function MyProfile({ onBack }: MyProfileProps) {
  const session = useSession();
  const { toast } = useToast();
  const updateUserMutation = useUpdateUser();
  const user = session.data?.user;

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    image: null as string | null,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const profileImage = profileData.image;

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        image: user.image || null,
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    // Reset form data to original user data
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        image: user.image || null,
      });
    }
    setImageError(null);
    setIsEditing(false);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setImageError(null);

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setImageError('Please choose an image smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfileData((prev) => ({ ...prev, image: reader.result as string }));
    };
    reader.onerror = () => setImageError('Could not read that image. Please try another file.');
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    updateUserMutation.mutate(
      {
        name: profileData.name,
        image: profileData.image,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'Your profile has been updated successfully.',
          });
          setIsEditing(false);
        },
        onError: (error) => {
          console.error('Error updating profile:', error);
          toast({
            title: 'Error',
            description: 'Failed to update profile. Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Manage your personal information and account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            {profileImage ? (
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full focus:outline-none focus:ring-2 focus:ring-ashinaga-teal-600 focus:ring-offset-2"
                    aria-label="Open profile picture"
                  >
                    <Avatar className="h-20 w-20 cursor-pointer">
                      <AvatarImage src={profileImage} alt={profileData.name} />
                      <AvatarFallback className="text-lg bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 text-white">
                        {profileData.name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-xl p-4">
                  <DialogTitle className="sr-only">Profile picture</DialogTitle>
                  <Image
                    src={profileImage}
                    alt={profileData.name || 'Profile picture'}
                    width={800}
                    height={800}
                    unoptimized
                    className="max-h-[75vh] w-full rounded-md object-contain"
                  />
                </DialogContent>
              </Dialog>
            ) : (
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-lg bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 text-white">
                  {profileData.name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h3 className="text-lg font-medium">{profileData.name}</h3>
              <p className="text-sm text-gray-600">{profileData.email}</p>
              {isEditing && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <label htmlFor="profile-picture">
                      <Camera className="h-4 w-4" />
                      Upload Photo
                    </label>
                  </Button>
                  {profileData.image && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setProfileData((prev) => ({ ...prev, image: null }))}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  )}
                  <Input
                    id="profile-picture"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageChange}
                  />
                </div>
              )}
              {imageError && <p className="mt-2 text-sm text-red-600">{imageError}</p>}
            </div>
          </div>

          {/* Profile Information */}
          <div className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                disabled
                title="Email cannot be changed"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateUserMutation.isPending}
                  className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
